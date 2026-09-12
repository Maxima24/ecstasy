"""The five learning endpoints.

Thin by design: parse, call a service, return. Every decision lives in
`domain/` (pure) or `services/` (rows to blocks), so these handlers stay
reviewable at a glance.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_token
from app.config import settings
from app.db.base import get_db
from app.db.models import Answer, Question, User
from app.db.seed import ensure_user, reset_user
from app.domain.policy import decide
from app.schemas.api import (
    AdaptationSummary,
    AskRequest,
    AskResponse,
    MasteryDelta,
    ProfileRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.schemas.blocks import ProgressPanelBlock, RoadmapBlock
from app.services import composition_service as composition
from app.services import materials_service as materials
from app.services import session_service as sessions

router = APIRouter(dependencies=[Depends(require_token)])

DEFAULT_FOCUS_TOPIC = "linear_equations"


def _not_found(code: str, message: str) -> HTTPException:
    exc = HTTPException(status_code=404, detail=message)
    exc.code = code  # type: ignore[attr-defined]
    return exc


@router.post("/ask", response_model=AskResponse, tags=["learning"])
def ask(body: AskRequest, db: Session = Depends(get_db)) -> AskResponse:
    """Compose the next screen from observed behaviour.

    SIDE-EFFECT FREE, and that is a correctness requirement rather than a
    preference. The frontend prefetches the other three profiles as soon as the
    first response lands, so this runs four times concurrently for one question.

    Two consequences are honoured here:
      * the profile is NOT persisted (that is POST /profile's job alone),
        because four concurrent writes with four different values is
        last-write-wins garbage;
      * question selection is deterministic for a given evidence state, so all
        four profiles show the same question and flipping between them does not
        silently swap it.
    """
    focus_topic_id = materials.resolve_focus_topic(db, body.question, DEFAULT_FOCUS_TOPIC)

    evidence = sessions.build_evidence(db, body.user_id, focus_topic_id)
    decision = decide(evidence)

    roadmap = sessions.roadmap_for(db, body.user_id)
    progress = sessions.progress_for(db, body.user_id)

    # Rotation key: how many answers this learner has given on the chosen
    # topic. Stable across the four concurrent prefetches, and only moves once
    # the learner actually answers.
    rotation = db.execute(
        select(func.count())
        .select_from(Answer)
        .where(Answer.user_id == body.user_id, Answer.topic_id == decision.topic.topic_id)
    ).scalar_one()

    blocks = composition.compose(
        db,
        decision=decision,
        profile=body.profile,
        roadmap=roadmap,
        progress=progress,
        rotation=rotation,
        audio_base_url=settings.public_base_url,
    )

    return AskResponse(
        spec_id=f"{body.profile}_{decision.state}_{evidence.revision}",
        cached=False,
        adaptation=AdaptationSummary(
            state=decision.state,
            # Must name a topic present in the roadmap above: the UI highlights
            # that row to show which evidence the decision rested on.
            topic_id=decision.topic.topic_id,
            reason=decision.reason,
        ),
        blocks=blocks,
    )


@router.post("/quiz/submit", response_model=QuizSubmitResponse, tags=["learning"])
def quiz_submit(body: QuizSubmitRequest, db: Session = Depends(get_db)) -> QuizSubmitResponse:
    """Record an answer. The only endpoint that moves mastery.

    Grades by `question_id` against the database. The client already holds
    `answer_index` for instant feedback, but the server never trusts it — the
    stored question is the truth.
    """
    question = db.get(Question, body.question_id)
    if question is None:
        raise _not_found("question_not_found", f"No question with id {body.question_id!r}.")

    correct = body.selected_index == question.answer_index

    before, after, roadmap_changed, _ = sessions.record_answer(
        db,
        user_id=body.user_id,
        topic_id=question.topic_id,
        question_id=body.question_id,
        selected_index=body.selected_index,
        correct=correct,
        elapsed_ms=body.elapsed_ms,
    )

    return QuizSubmitResponse(
        correct=correct,
        answer_index=question.answer_index,
        mastery=MasteryDelta(topic_id=question.topic_id, before=before, after=after),
        roadmap_changed=roadmap_changed,
    )


@router.get("/roadmap", response_model=RoadmapBlock, tags=["learning"])
def roadmap(user_id: str = Query(default="demo"), db: Session = Depends(get_db)) -> RoadmapBlock:
    return sessions.roadmap_for(db, user_id)


@router.get("/progress", response_model=ProgressPanelBlock, tags=["learning"])
def progress(
    user_id: str = Query(default="demo"), db: Session = Depends(get_db)
) -> ProgressPanelBlock:
    return sessions.progress_for(db, user_id)


@router.post(
    "/profile",
    status_code=204,
    response_class=Response,
    response_model=None,
    tags=["learning"],
)
def set_profile(body: ProfileRequest, db: Session = Depends(get_db)) -> Response:
    """Persist the delivery preference. The ONLY writer of `profile`.

    204 with a genuinely empty body: all three of status_code, response_class
    and response_model=None are required, or FastAPI documents a 200 JSON
    response and the contract lies about what this returns.
    """
    user: User = ensure_user(db, body.user_id)
    user.profile = body.profile
    db.commit()
    return Response(status_code=204)


@router.post("/admin/reset", status_code=204, response_class=Response, response_model=None, tags=["admin"])
def admin_reset(
    user_id: str = Query(default="demo"), db: Session = Depends(get_db)
) -> Response:
    """Restore a user to seed state.

    The fixture reset on every process restart; a real database does not, so
    after two rehearsals the demo account is dirty. There is no proxy route for
    this in the frontend, so it is unreachable from the browser by construction.
    """
    reset_user(db, user_id)
    return Response(status_code=204)
