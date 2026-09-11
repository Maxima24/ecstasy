"""The block union — this IS the wire contract.

Mirrors ``frontend/src/lib/types.ts``. Every constraint the frontend documents in
prose is expressed here as a Pydantic constraint instead, so the exported
OpenAPI carries it and the generated TypeScript enforces it.

Three fields exist here that are NOT in the original PRD contract. They were
added frontend-side ahead of any published artifact and the backend must
produce them:

* ``RoadmapStep.evidence_claim`` / ``WeakTopic.evidence_claim`` — the UI renders
  these *instead of* mastery percentages. A missing claim is a blank row.
* ``AskResponse.adaptation`` — without it the UI cannot explain itself.
* ``ExplainerStep.faded`` — backward fading of a worked example.
"""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

Profile = Literal["rusty", "time_poor", "hands_free", "strong"]
RoadmapStatus = Literal["next", "done", "later"]

InstructionalState = Literal[
    "worked_transfer",
    "guided_practice",
    "focused_practice",
    "timed_drill",
    "prerequisite_reset",
]
"""The five states the UI knows how to label.

`Screen.tsx` maps each to a session label. Adding a sixth is a BREAKING change
for the frontend, not an additive one — it would render an empty label.
"""


class Strict(BaseModel):
    """Reject unknown fields.

    A block the frontend does not understand renders as nothing, silently. Far
    better to fail here, where the error names the field.
    """

    model_config = ConfigDict(extra="forbid")


class Citation(Strict):
    chunk_id: str
    label: str


class ExplainerStep(Strict):
    text: str
    expr: str | None = Field(
        default=None,
        description="TeX, marked at ingestion. The frontend never derives this from prose.",
    )
    faded: bool | None = Field(
        default=None,
        description=(
            "Withhold this step's result and invite the learner to supply it. "
            "Backward fading: set on the LAST step only, and only when the "
            "learner has shown they can already do it."
        ),
    )


class ExplainerCardBlock(Strict):
    type: Literal["explainer_card"] = "explainer_card"
    title: str
    steps: list[ExplainerStep] = Field(min_length=2, max_length=5)
    citation: Citation | None = None


class AudioExplainerBlock(Strict):
    type: Literal["audio_explainer"] = "audio_explainer"
    script: str
    audio_url: str = Field(
        description="Must be playable when /ask responds. The frontend never calls TTS."
    )
    duration_ms: int = Field(ge=0)
    transcript_shown: bool


class QuizQuestion(Strict):
    id: str
    stem: str
    stem_expr: str | None = None
    options: list[str] = Field(min_length=5, max_length=5)
    topic_id: str
    answer_index: int = Field(ge=0, le=4)
    rationale: str


class QuizBlock(Strict):
    type: Literal["quiz"] = "quiz"
    timer_seconds: int | None = Field(
        default=None,
        description="Non-null for the `strong` profile only; null for every other.",
    )
    questions: list[QuizQuestion] = Field(min_length=1)


class RoadmapStep(Strict):
    topic_id: str
    label: str
    mastery: float = Field(
        ge=0.0,
        le=1.0,
        description="Ordering weight only. Never rendered — the UI shows evidence_claim.",
    )
    evidence_claim: str = Field(
        min_length=1,
        description="Learner-facing, never a percentage. Rendered instead of mastery.",
    )
    status: RoadmapStatus


class RoadmapBlock(Strict):
    type: Literal["roadmap"] = "roadmap"
    steps: list[RoadmapStep] = Field(min_length=1)

    @model_validator(mode="after")
    def exactly_one_next(self) -> "RoadmapBlock":
        """Prove the contract's guarantee on every response.

        Ordering is derived from mastery rather than stored, so this should be
        true by construction. Asserting it at the boundary is what stops a
        future refactor from quietly breaking it.
        """
        count = sum(1 for step in self.steps if step.status == "next")
        if count != 1:
            raise ValueError(f"roadmap must have exactly one step with status 'next', found {count}")
        return self


class Flashcard(Strict):
    front: str
    back: str
    topic_id: str


class FlashcardsBlock(Strict):
    type: Literal["flashcards"] = "flashcards"
    cards: list[Flashcard] = Field(min_length=1)


class WeakTopic(Strict):
    topic_id: str
    label: str
    mastery: float = Field(ge=0.0, le=1.0)
    evidence_claim: str = Field(min_length=1)


class ProgressPanelBlock(Strict):
    type: Literal["progress_panel"] = "progress_panel"
    weakest_topics: list[WeakTopic] = Field(min_length=1, max_length=3)
    streak: int = Field(ge=0)
    next_action_label: str


Block = Annotated[
    Union[
        ExplainerCardBlock,
        AudioExplainerBlock,
        QuizBlock,
        RoadmapBlock,
        FlashcardsBlock,
        ProgressPanelBlock,
    ],
    Field(discriminator="type"),
]
"""Discriminated on `type`.

Pydantic emits `oneOf` plus a discriminator, which openapi-typescript turns into
a union that narrows on `type` — matching the `switch (block.type)` the
frontend's BlockRenderer already does.
"""
