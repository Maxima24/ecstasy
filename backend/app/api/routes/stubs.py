"""Endpoint declarations.

Day 1: shapes only. Every handler raises 501 so the contract can be exported and
published before the domain logic exists — the frontend can then generate its
types on day 2 rather than day 14, and every later backend change is measured
against a published artifact instead of against the frontend source tree (which
AGENTS.md forbids the backend agent from reading).
"""

from fastapi import APIRouter, HTTPException, Query, Response

from app.schemas.api import (
    AskRequest,
    AskResponse,
    ProfileRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.schemas.blocks import ProgressPanelBlock, RoadmapBlock

router = APIRouter()


def _unimplemented() -> HTTPException:
    exc = HTTPException(status_code=501, detail="Not implemented yet.")
    exc.code = "not_implemented"  # type: ignore[attr-defined]
    return exc


@router.post("/ask", response_model=AskResponse, tags=["learning"])
def ask(body: AskRequest) -> AskResponse:
    """Compose the next screen from observed behaviour.

    MUST BE SIDE-EFFECT FREE. The frontend prefetches the other three profiles
    the instant the first response lands, so this is called four times per
    question, concurrently. It must not persist the profile (four racing writes)
    and question selection must be deterministic for a given evidence state, or
    flipping profiles silently changes the question on screen.
    """
    raise _unimplemented()


@router.post("/quiz/submit", response_model=QuizSubmitResponse, tags=["learning"])
def quiz_submit(body: QuizSubmitRequest) -> QuizSubmitResponse:
    """Record an answer. The only endpoint that moves mastery."""
    raise _unimplemented()


@router.get("/roadmap", response_model=RoadmapBlock, tags=["learning"])
def roadmap(user_id: str = Query(default="demo")) -> RoadmapBlock:
    raise _unimplemented()


@router.get("/progress", response_model=ProgressPanelBlock, tags=["learning"])
def progress(user_id: str = Query(default="demo")) -> ProgressPanelBlock:
    raise _unimplemented()


@router.post("/profile", status_code=204, response_class=Response, response_model=None, tags=["learning"])
def set_profile(body: ProfileRequest) -> Response:
    """Persist the delivery preference.

    204 with a genuinely empty body. All three of status_code, response_class
    and response_model=None are required, or FastAPI documents a 200 JSON
    response and the contract lies about what this returns.
    """
    raise _unimplemented()
