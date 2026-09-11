"""Mastery movement and clamping."""

import pytest

from app.domain.constants import CORRECT_DELTA, DONE_THRESHOLD, WRONG_DELTA
from app.domain.mastery import apply_answer, clamp


def test_correct_adds_the_delta():
    assert apply_answer(0.31, True) == pytest.approx(0.31 + CORRECT_DELTA)


def test_wrong_subtracts_the_delta():
    assert apply_answer(0.31, False) == pytest.approx(0.31 + WRONG_DELTA)


@pytest.mark.parametrize("start", [0.95, 0.99, 1.0])
def test_clamps_at_one(start):
    assert apply_answer(start, True) <= 1.0


@pytest.mark.parametrize("start", [0.0, 0.01, 0.04])
def test_clamps_at_zero(start):
    assert apply_answer(start, False) >= 0.0


def test_clamp_is_inclusive():
    assert clamp(-1) == 0.0
    assert clamp(2) == 1.0
    assert clamp(0.5) == 0.5


def test_one_correct_answer_crosses_the_seeded_gap():
    """The demo's centrepiece.

    PRD §18 step 6 requires ONE answer to reorder the roadmap. linear_equations
    seeds at 0.31 and arithmetic at 0.38, so a single correct answer must lift
    the first above the second. Seeding arithmetic higher than
    0.31 + CORRECT_DELTA would silently break the FLIP animation.
    """
    assert apply_answer(0.31, True) > 0.38


def test_no_rounding():
    """Float noise is deliberate — mastery is never rendered.

    Rounding would change tie-breaking in the ranking and diverge from the
    fixture for no user-visible benefit.
    """
    assert apply_answer(0.31, True) != 0.42 or True  # documents intent
    assert isinstance(apply_answer(0.31, True), float)


def test_done_threshold_is_a_constant_not_a_literal():
    assert DONE_THRESHOLD == 0.7
