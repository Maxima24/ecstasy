"""The adaptation state machine.

A pure function from evidence to a decision. No database, no HTTP, no framework
— which is what lets every branch be tested in milliseconds against the captured
goldens instead of through the app.

Ported from ``frontend/src/lib/adaptation/policy.ts``. The reason strings are
reproduced exactly: they render verbatim under "Why this path", and
FRONTEND_PLAN §19 is blunt that "the reason string is what distinguishes
adapting from appearing to adapt".

No em dashes in learner-facing copy, by product decision. A colon separates a
label from its explanation; a full stop separates two complete clauses.

DECISION ORDER IS THE CONTRACT. First match wins, and the order is not
arbitrary:

1. no focus topic       — a malformed session still yields a reviewable screen
2. prerequisite_reset   — repeated misses AND a prerequisite exists
3. timed_drill          — a fast correct streak
4. worked_transfer      — the latest answer was wrong
5. guided_practice      — latest correct but slow
6. focused_practice     — the default

Note 2 before 3: a learner who has just missed twice should step back to the
prerequisite even if older answers were fast and correct. And note the
`and a prerequisite exists` guard — repeated misses on a topic with no
prerequisite falls THROUGH to worked_transfer, which is easy to get wrong.
"""

from dataclasses import dataclass
from typing import Literal

from app.domain.constants import (
    FAST_CORRECT_STREAK,
    FAST_RESPONSE_MAX_MS,
    REPEATED_MISSES,
    SLOW_RESPONSE_MIN_MS,
)
from app.domain.evidence import ObservedAnswer, SessionEvidence, TopicEvidence

InstructionalState = Literal[
    "worked_transfer",
    "guided_practice",
    "focused_practice",
    "timed_drill",
    "prerequisite_reset",
]


@dataclass(frozen=True, slots=True)
class Decision:
    state: InstructionalState
    topic: TopicEvidence
    reason: str


def _is_fast_correct(answer: ObservedAnswer) -> bool:
    return answer.correct and answer.elapsed_ms <= FAST_RESPONSE_MAX_MS


def _repeated_miss(topic: TopicEvidence) -> bool:
    recent = topic.trailing(REPEATED_MISSES)
    return len(recent) == REPEATED_MISSES and all(not a.correct for a in recent)


def _fast_correct_streak(topic: TopicEvidence) -> bool:
    recent = topic.trailing(FAST_CORRECT_STREAK)
    return len(recent) == FAST_CORRECT_STREAK and all(_is_fast_correct(a) for a in recent)


def decide(evidence: SessionEvidence) -> Decision:
    """Choose the instructional state and the topic it applies to."""
    focus = evidence.topic(evidence.focus_topic_id)

    # A malformed session should still produce a complete, reviewable screen
    # rather than an error page.
    if focus is None:
        candidates = list(evidence.topics.values())
        if not candidates:
            raise ValueError("adaptation needs at least one topic")
        fallback = candidates[0]
        return Decision(
            state="focused_practice",
            topic=fallback,
            reason=f"Starting with a {fallback.label.lower()} check.",
        )

    if _repeated_miss(focus) and focus.prerequisite_topic_id:
        prerequisite = evidence.topic(focus.prerequisite_topic_id)
        if prerequisite is not None:
            return Decision(
                state="prerequisite_reset",
                topic=prerequisite,
                reason=(
                    f"Back to {prerequisite.label.lower()} first. "
                    f"That is what {focus.label.lower()} depends on."
                ),
            )

    if _fast_correct_streak(focus):
        return Decision(
            state="timed_drill",
            topic=focus,
            reason=f"Timed drill: two fast correct {focus.label.lower()} answers.",
        )

    latest = focus.latest

    if latest is not None and not latest.correct:
        return Decision(
            state="worked_transfer",
            topic=focus,
            reason=f"More guidance: your last {focus.label.lower()} answer was wrong.",
        )

    if latest is not None and latest.correct and latest.elapsed_ms >= SLOW_RESPONSE_MIN_MS:
        return Decision(
            state="guided_practice",
            topic=focus,
            reason=(
                f"More guidance: your last {focus.label.lower()} answer "
                "was correct but slow."
            ),
        )

    reason = (
        f"Near-transfer question: your last {focus.label.lower()} answer was correct."
        if latest is not None and latest.correct
        else f"Starting with a {focus.label.lower()} check."
    )
    return Decision(state="focused_practice", topic=focus, reason=reason)
