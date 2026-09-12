"""Database rows in, contract blocks out.

The only layer that knows about both. `domain/` stays pure and `api/` stays
thin; everything that has to translate between a row and a block happens here.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Answer, Mastery, Topic, User
from app.db.seed import ensure_user
from app.domain.claims import evidence_claim
from app.domain.constants import RECENT_WINDOW
from app.domain.evidence import ObservedAnswer, SessionEvidence, TopicEvidence
from app.domain.mastery import apply_answer
from app.domain.ranking import ranked, roadmap_signature, status_for
from app.schemas.blocks import (
    ProgressPanelBlock,
    RoadmapBlock,
    RoadmapStep,
    WeakTopic,
)

WEAKEST_TOPIC_LIMIT = 3
"""The contract caps this at three. Fewer is fine; the UI maps whatever arrives."""


def _topics(db: Session) -> dict[str, Topic]:
    return {t.id: t for t in db.execute(select(Topic)).scalars()}


def _mastery(db: Session, user_id: str) -> dict[str, float]:
    """Mastery per topic, falling back to the topic's seed value.

    The fallback is not cosmetic. A roadmap built from an empty mastery map has
    zero steps, which the contract forbids and Pydantic rejects, turning a
    missing row into a 500. Defaulting to the seed means every topic always has
    a position, so a missing row degrades to "as if unpractised" rather than to
    a broken screen.
    """
    stored = {
        m.topic_id: m.value
        for m in db.execute(select(Mastery).where(Mastery.user_id == user_id)).scalars()
    }
    return {
        topic.id: stored.get(topic.id, topic.seed_mastery)
        for topic in db.execute(select(Topic)).scalars()
    }


def _recent(db: Session, user_id: str) -> dict[str, tuple[ObservedAnswer, ...]]:
    """Recent answers per topic, newest last.

    The window is applied here, on read. The table keeps every answer, so
    widening RECENT_WINDOW later does not need rows that were already thrown
    away.
    """
    rows = db.execute(
        select(Answer).where(Answer.user_id == user_id).order_by(Answer.sequence)
    ).scalars()

    by_topic: dict[str, list[ObservedAnswer]] = {}
    for row in rows:
        by_topic.setdefault(row.topic_id, []).append(
            ObservedAnswer(correct=row.correct, elapsed_ms=row.elapsed_ms, sequence=row.sequence)
        )
    return {topic_id: tuple(answers[-RECENT_WINDOW:]) for topic_id, answers in by_topic.items()}


def build_evidence(db: Session, user_id: str, focus_topic_id: str) -> SessionEvidence:
    """Everything the policy is allowed to see.

    Assembled here rather than inside the policy, which is what keeps the policy
    a pure function of evidence and therefore reviewable without a database.
    """
    user = ensure_user(db, user_id)
    topics = _topics(db)
    recent = _recent(db, user_id)

    return SessionEvidence(
        user_id=user_id,
        revision=user.sequence,
        focus_topic_id=focus_topic_id,
        streak=user.streak,
        topics={
            topic.id: TopicEvidence(
                topic_id=topic.id,
                label=topic.label,
                prerequisite_topic_id=topic.prerequisite_topic_id,
                recent=recent.get(topic.id, ()),
            )
            for topic in topics.values()
        },
    )


def _ranked_rows(db: Session, user_id: str) -> list[tuple[Topic, float, str]]:
    """(topic, mastery, claim) weakest first. The single ordering everything uses."""
    topics = _topics(db)
    mastery = _mastery(db, user_id)
    recent = _recent(db, user_id)

    rows = []
    for topic_id in ranked(mastery):
        topic = topics[topic_id]
        value = mastery[topic_id]
        rows.append(
            (topic, value, evidence_claim(recent.get(topic_id, ()), value, topic.label))
        )
    return rows


def roadmap_for(db: Session, user_id: str) -> RoadmapBlock:
    ensure_user(db, user_id)
    rows = _ranked_rows(db, user_id)

    return RoadmapBlock(
        steps=[
            RoadmapStep(
                topic_id=topic.id,
                label=topic.label,
                mastery=value,
                evidence_claim=claim,
                # Index 0 is `next`. That is the guarantee, and it is positional
                # rather than stored.
                status=status_for(i, value),
            )
            for i, (topic, value, claim) in enumerate(rows)
        ]
    )


def progress_for(db: Session, user_id: str) -> ProgressPanelBlock:
    user = ensure_user(db, user_id)
    rows = _ranked_rows(db, user_id)
    weakest_label = rows[0][0].label if rows else "practice"

    return ProgressPanelBlock(
        weakest_topics=[
            WeakTopic(
                topic_id=topic.id,
                label=topic.label,
                mastery=value,
                evidence_claim=claim,
            )
            for topic, value, claim in rows[:WEAKEST_TOPIC_LIMIT]
        ],
        streak=user.streak,
        next_action_label=f"Practise {weakest_label.lower()} next",
    )


def _signature(db: Session, user_id: str) -> str:
    return roadmap_signature(
        [(step.topic_id, step.status, step.evidence_claim) for step in roadmap_for(db, user_id).steps]
    )


def record_answer(
    db: Session,
    user_id: str,
    topic_id: str,
    question_id: str,
    selected_index: int,
    correct: bool,
    elapsed_ms: int,
) -> tuple[float, float, bool, int]:
    """Apply one answer. Returns (before, after, roadmap_changed, streak).

    `roadmap_changed` compares the whole visible roadmap, not just the ordering.
    The client uses it to decide whether to refetch, so it must mean "the
    roadmap changed" — an answer that moves no rows still changes a claim, and
    reporting False there leaves the screen showing stale evidence.
    """
    user: User = ensure_user(db, user_id)
    before_signature = _signature(db, user_id)

    row = db.get(Mastery, (user_id, topic_id))
    before = row.value if row else 0.0
    after = apply_answer(before, correct)

    if row is None:
        db.add(Mastery(user_id=user_id, topic_id=topic_id, value=after))
    else:
        row.value = after

    user.sequence += 1
    user.streak = user.streak + 1 if correct else 0

    db.add(
        Answer(
            user_id=user_id,
            topic_id=topic_id,
            question_id=question_id,
            selected_index=selected_index,
            correct=correct,
            elapsed_ms=elapsed_ms,
            sequence=user.sequence,
        )
    )
    db.commit()

    return before, after, _signature(db, user_id) != before_signature, user.streak
