"""Mastery movement.

A ranking weight, deliberately not a measurement. The UI never renders this
number — it renders an evidence claim instead (see `claims.py`), because "31%"
implies a precision this system has not earned.
"""

from app.domain.constants import CORRECT_DELTA, WRONG_DELTA


def clamp(value: float) -> float:
    return min(1.0, max(0.0, value))


def apply_answer(before: float, correct: bool) -> float:
    """Move mastery for one answer, clamped to [0, 1].

    No rounding. The float noise (0.31 + 0.11 = 0.42000000000000004) is
    invisible because mastery is never rendered, and rounding here would change
    tie-breaking in the ranking — diverging from the fixture for no benefit.
    """
    return clamp(before + (CORRECT_DELTA if correct else WRONG_DELTA))
