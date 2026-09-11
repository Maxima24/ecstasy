"""What the learner is told about a topic.

Deliberately never a percentage. A number like "31%" implies a measurement this
prototype has not earned, and pseudo-precision reads as less intelligent rather
than more. Every claim here is something the session can actually evidence: how
many recent answers were right, and how quickly.

The UI renders these INSTEAD of mastery — `Roadmap.tsx` and `ProgressPanel.tsx`
display the claim and never the number. An empty claim is a blank row, not a
degraded one.

The separator is U+00B7 MIDDLE DOT, not an ASCII full stop or a hyphen. The
captured goldens encode the exact bytes; `tests/test_claims.py` asserts them.
"""

from app.domain.constants import (
    DONE_THRESHOLD,
    FAST_RESPONSE_MAX_MS,
    SLOW_RESPONSE_MIN_MS,
)
from app.domain.evidence import ObservedAnswer

SEPARATOR = "\u00b7"  # MIDDLE DOT


def evidence_claim(
    recent: tuple[ObservedAnswer, ...],
    mastery: float,
    label: str,
) -> str:
    """The claim for one topic, from its windowed answers.

    Branch order matters and mirrors the fixture exactly:

    1. no answers at all      -> steady, or not practised
    2. all correct, all fast  -> ready for a timed question
    3. all correct, any slow  -> slow but accurate
    4. none correct           -> needs another problem
    5. otherwise              -> the bare tally
    """
    if not recent:
        return "Steady so far" if mastery >= DONE_THRESHOLD else "Not practised yet"

    correct = sum(1 for a in recent if a.correct)
    tally = f"{correct} of last {len(recent)} correct"

    fast = sum(1 for a in recent if a.elapsed_ms <= FAST_RESPONSE_MAX_MS)
    slow = sum(1 for a in recent if a.elapsed_ms >= SLOW_RESPONSE_MIN_MS)

    if correct == len(recent) and fast == len(recent):
        return f"{tally} {SEPARATOR} ready for a timed question"
    if correct == len(recent) and slow > 0:
        return f"{tally} {SEPARATOR} slow but accurate"
    if correct == 0:
        return f"{tally} {SEPARATOR} needs another {label.lower()} problem"
    return tally
