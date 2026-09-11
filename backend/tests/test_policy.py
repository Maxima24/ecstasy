"""The state machine, table-driven.

The cases that matter are the ORDERINGS. Any single branch is easy; what breaks
under maintenance is one branch quietly overtaking another.
"""

import pytest

from app.domain.evidence import SessionEvidence, TopicEvidence
from app.domain.policy import decide
from tests.conftest import correct, wrong


def test_no_answers_is_focused_practice(seeded):
    d = decide(seeded())
    assert d.state == "focused_practice"
    assert d.reason == "Starting with a linear equations check."


def test_latest_wrong_is_worked_transfer(seeded):
    assert decide(seeded([wrong()])).state == "worked_transfer"


def test_latest_correct_but_slow_is_guided_practice(seeded):
    assert decide(seeded([correct(24_000)])).state == "guided_practice"


def test_latest_correct_and_fast_is_focused_practice(seeded):
    d = decide(seeded([correct(4_000)]))
    assert d.state == "focused_practice"
    assert "was correct" in d.reason


def test_two_fast_correct_is_timed_drill(seeded):
    assert decide(seeded([correct(4_000, 1), correct(4_000, 2)])).state == "timed_drill"


def test_two_misses_is_prerequisite_reset_and_retargets(seeded):
    d = decide(seeded([wrong(seq=1), wrong(seq=2)]))
    assert d.state == "prerequisite_reset"
    # The decision is ABOUT the prerequisite, not the topic that was missed.
    assert d.topic.topic_id == "arithmetic"
    assert "Back to arithmetic first" in d.reason


# --- precedence: the orderings that actually break --------------------------


def test_prerequisite_reset_beats_timed_drill(seeded):
    """Two misses after a fast-correct streak still steps back.

    The window holds both, so both predicates could fire. Repeated misses must
    win: a learner who has just failed twice should not be handed a timed drill.
    """
    d = decide(seeded([correct(4_000, 1), correct(4_000, 2), wrong(seq=3), wrong(seq=4)]))
    assert d.state == "prerequisite_reset"


def test_repeated_miss_without_a_prerequisite_falls_through():
    """The "and a prerequisite exists" guard is load-bearing.

    A topic with no prerequisite has nothing to step back to, so two misses must
    fall through to worked_transfer rather than produce a reset with no target.
    """
    evidence = SessionEvidence(
        user_id="demo",
        revision=0,
        focus_topic_id="arithmetic",
        topics={
            "arithmetic": TopicEvidence(
                "arithmetic", "Arithmetic", None, (wrong(seq=1), wrong(seq=2))
            )
        },
    )
    d = decide(evidence)
    assert d.state == "worked_transfer"
    assert d.topic.topic_id == "arithmetic"


def test_repeated_miss_with_an_unresolvable_prerequisite_falls_through():
    """A prerequisite id that does not resolve must not crash or reset."""
    evidence = SessionEvidence(
        user_id="demo",
        revision=0,
        focus_topic_id="linear_equations",
        topics={
            "linear_equations": TopicEvidence(
                "linear_equations",
                "Linear equations",
                "does_not_exist",
                (wrong(seq=1), wrong(seq=2)),
            )
        },
    )
    assert decide(evidence).state == "worked_transfer"


def test_timed_drill_beats_worked_transfer(seeded):
    """A fast-correct streak is evaluated before the latest-wrong check."""
    assert decide(seeded([correct(4_000, 1), correct(4_000, 2)])).state == "timed_drill"


# --- boundaries -------------------------------------------------------------


def test_fast_threshold_is_inclusive(seeded):
    """8000ms exactly counts as fast."""
    assert decide(seeded([correct(8_000, 1), correct(8_000, 2)])).state == "timed_drill"


def test_one_millisecond_over_fast_is_not_a_streak(seeded):
    assert decide(seeded([correct(8_001, 1), correct(8_001, 2)])).state == "focused_practice"


def test_slow_threshold_is_inclusive(seeded):
    """15000ms exactly counts as slow."""
    assert decide(seeded([correct(15_000)])).state == "guided_practice"


def test_one_millisecond_under_slow_is_not_guided(seeded):
    assert decide(seeded([correct(14_999)])).state == "focused_practice"


def test_a_single_miss_is_not_a_repeated_miss(seeded):
    assert decide(seeded([wrong()])).state == "worked_transfer"


# --- degenerate input -------------------------------------------------------


def test_missing_focus_topic_still_yields_a_screen():
    """A malformed session must stay reviewable rather than error."""
    evidence = SessionEvidence(
        user_id="demo",
        revision=0,
        focus_topic_id="gone",
        topics={"arithmetic": TopicEvidence("arithmetic", "Arithmetic", None, ())},
    )
    d = decide(evidence)
    assert d.state == "focused_practice"
    assert d.topic.topic_id == "arithmetic"


def test_no_topics_at_all_raises():
    evidence = SessionEvidence(user_id="demo", revision=0, focus_topic_id="x", topics={})
    with pytest.raises(ValueError):
        decide(evidence)


# --- copy -------------------------------------------------------------------


@pytest.mark.parametrize(
    "recent",
    [
        [],
        [correct(4_000)],
        [wrong()],
        [correct(24_000)],
        [correct(4_000, 1), correct(4_000, 2)],
        [wrong(seq=1), wrong(seq=2)],
    ],
)
def test_no_em_dash_in_any_reason(seeded, recent):
    """Product decision: no em or en dashes in learner-facing copy."""
    reason = decide(seeded(recent)).reason
    assert "—" not in reason
    assert "–" not in reason
