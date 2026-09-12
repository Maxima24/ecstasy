"""Assemble the screen.

Ported from the block-composition half of
``frontend/src/lib/adaptation/policy.ts``.

No profile is a pre-authored screen. The instructional state is chosen first,
from behaviour alone; the profile then changes ordering, modality and density
around it. That separation is the product's whole claim, so it is worth stating
where it actually happens.

The frontend clamps this again in `src/lib/invariants.ts` (rusty keeps one
block, strong drops explainers, hands_free hoists audio, time_poor hoists the
roadmap). Ordering here still matters: because rusty slices to the FIRST block,
what this function puts first decides what survives.
"""

from sqlalchemy.orm import Session

from app.domain.constants import COMPRESSED_TIMER_SECONDS, STANDARD_TIMER_SECONDS
from app.domain.policy import Decision, InstructionalState
from app.schemas.blocks import Block, Profile, QuizBlock
from app.services import materials_service as materials

MAX_BLOCKS = 5
"""The contract's cap. rusty discards all but the first anyway."""

# States that warrant a worked example before the question.
GUIDED_STATES: frozenset[str] = frozenset(
    {"worked_transfer", "guided_practice", "prerequisite_reset"}
)


def quiz_kind(state: InstructionalState) -> str:
    if state == "timed_drill":
        return "timed"
    if state == "focused_practice":
        return "transfer"
    return "guided"


def timer_seconds(state: InstructionalState, profile: Profile) -> int | None:
    """Visible countdowns are reserved for `strong`.

    Other profiles still receive the compressed question a timed drill selects,
    but without a clock. Rushing a learner who is rebuilding confidence is the
    opposite of what the state means.
    """
    if profile != "strong":
        return None
    return COMPRESSED_TIMER_SECONDS if state == "timed_drill" else STANDARD_TIMER_SECONDS


def _quiz(db: Session, topic_id: str, state: InstructionalState, profile: Profile, rotation: int) -> QuizBlock:
    return QuizBlock(
        timer_seconds=timer_seconds(state, profile),
        questions=[materials.question_for(db, topic_id, quiz_kind(state), rotation)],
    )


def _instructional_core(
    db: Session, topic_id: str, state: InstructionalState, profile: Profile, rotation: int
) -> list[Block]:
    quiz = _quiz(db, topic_id, state, profile, rotation)

    if state in GUIDED_STATES:
        # Faded ONLY for guided_practice: the learner answered correctly but
        # slowly, so they can already do this and completing the example beats
        # reading it. Someone who got it wrong, or who is back on a
        # prerequisite, still gets the whole thing.
        explainer = materials.explainer_for(db, topic_id, fade=state == "guided_practice")
        return [explainer, quiz]

    return [quiz]


def compose(
    db: Session,
    decision: Decision,
    profile: Profile,
    roadmap: Block,
    progress: Block,
    rotation: int,
    audio_base_url: str,
) -> list[Block]:
    """The block list for one screen."""
    topic_id = decision.topic.topic_id
    core = _instructional_core(db, topic_id, decision.state, profile, rotation)

    # `rusty` must open with a segmented worked example even after strong
    # evidence, because the invariant clamps that profile to the first block.
    if profile == "rusty" and (not core or core[0].type != "explainer_card"):
        core = [materials.explainer_for(db, topic_id), *core]

    if profile == "time_poor":
        blocks = [roadmap, *core, progress]
    elif profile == "hands_free":
        blocks = [
            materials.audio_for(db, topic_id, audio_base_url),
            *core,
            materials.flashcards_for(db, topic_id),
        ]
    else:  # rusty and strong
        blocks = [*core, roadmap, progress]

    return blocks[:MAX_BLOCKS]
