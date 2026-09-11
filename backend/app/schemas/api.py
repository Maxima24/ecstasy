"""Request and response envelopes for the six endpoints."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.blocks import Block, InstructionalState, Profile


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AdaptationSummary(Strict):
    """Why this screen looks the way it does.

    A first-class part of the response, not a string the UI assembles. The
    reason renders verbatim under "Why this path", and `topic_id` MUST name a
    topic present in the roadmap block of the same response — the UI highlights
    that row to show which evidence the decision rested on.
    """

    state: InstructionalState
    topic_id: str
    reason: str = Field(
        min_length=1,
        description="Learner-facing. 'Back to arithmetic first — that is what linear equations depends on.'",
    )


class AskRequest(Strict):
    user_id: str
    profile: Profile
    question: str


class AskResponse(Strict):
    spec_id: str
    cached: bool = Field(
        description="Dev overlay only. Never shown to a learner."
    )
    adaptation: AdaptationSummary
    blocks: list[Block] = Field(min_length=1, max_length=5)


class QuizSubmitRequest(Strict):
    user_id: str
    question_id: str
    topic_id: str
    selected_index: int = Field(ge=0)
    elapsed_ms: int = Field(
        ge=0,
        description=(
            "Not telemetry. The policy reads this to tell a confident answer "
            "from a laboured one, which is what separates a timed drill from "
            "guided practice."
        ),
    )


class MasteryDelta(Strict):
    topic_id: str
    before: float = Field(ge=0.0, le=1.0)
    after: float = Field(ge=0.0, le=1.0)


class QuizSubmitResponse(Strict):
    correct: bool
    answer_index: int = Field(ge=0, le=4)
    mastery: MasteryDelta
    roadmap_changed: bool = Field(
        description=(
            "True when ANYTHING the learner can see on the roadmap changed — "
            "ordering, status or evidence claim — not merely the ordering. The "
            "client uses this to decide whether to refetch, so a claim-only "
            "change must still report true or the screen keeps a stale row."
        )
    )


class ProfileRequest(Strict):
    user_id: str
    profile: Profile
