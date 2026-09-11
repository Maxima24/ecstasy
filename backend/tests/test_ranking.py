"""Roadmap ordering, status, and the change signature."""

import pytest

from app.domain.ranking import TOPIC_ID_PATTERN, ranked, roadmap_signature, status_for

SEEDED_IDS = ["linear_equations", "arithmetic"]


def test_weakest_first():
    assert ranked({"linear_equations": 0.31, "arithmetic": 0.38}) == [
        "linear_equations",
        "arithmetic",
    ]


def test_one_correct_answer_flips_the_order():
    """0.31 + CORRECT_DELTA crosses arithmetic's 0.38.

    This is the demo's centrepiece: PRD 18.6 requires one answer to reorder.
    """
    assert ranked({"linear_equations": 0.42, "arithmetic": 0.38})[0] == "arithmetic"


def test_ties_break_on_topic_id():
    """So a row never jitters between two equal positions."""
    assert ranked({"b_topic": 0.5, "a_topic": 0.5}) == ["a_topic", "b_topic"]


def test_index_zero_is_always_next_even_when_mastered():
    """The guarantee is structural, not conditional on the mastery value."""
    assert status_for(0, 0.99) == "next"


def test_status_threshold_is_inclusive():
    assert status_for(1, 0.70) == "done"
    assert status_for(1, 0.6999) == "later"


def test_exactly_one_next_by_construction():
    mastery = {"a_one": 0.1, "b_two": 0.5, "c_three": 0.9}
    statuses = [status_for(i, mastery[t]) for i, t in enumerate(ranked(mastery))]
    assert statuses.count("next") == 1


@pytest.mark.parametrize("topic_id", SEEDED_IDS)
def test_seeded_ids_are_collation_safe(topic_id):
    """Python sorts by codepoint; JavaScript localeCompare is ICU-collated.

    The two agree for ids matching the pattern below and can diverge on case or
    hyphens. Enforcing the pattern is what keeps the orderings identical, so
    this is a parity guard rather than a style rule.
    """
    assert TOPIC_ID_PATTERN.match(topic_id)


def test_signature_includes_the_claim_not_just_the_order():
    """roadmap_changed must mean the roadmap changed, not the order changed.

    An answer that moves no rows still changes a claim. Reporting False there
    leaves the screen showing stale evidence.
    """
    before = roadmap_signature([("a_topic", "next", "Not practised yet")])
    after = roadmap_signature([("a_topic", "next", "1 of last 1 correct")])
    assert before != after


def test_signature_is_stable_when_nothing_changed():
    steps = [("a_topic", "next", "Not practised yet"), ("b_topic", "later", "Steady so far")]
    assert roadmap_signature(steps) == roadmap_signature(steps)


def test_signature_detects_a_status_change():
    before = roadmap_signature([("a_topic", "later", "Steady so far")])
    after = roadmap_signature([("a_topic", "done", "Steady so far")])
    assert before != after
