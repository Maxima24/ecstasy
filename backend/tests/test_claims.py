"""Evidence claims — every branch, with exact strings.

These render INSTEAD of mastery percentages, so a wrong string is a wrong row
in the UI, not a cosmetic difference.
"""

from app.domain.claims import SEPARATOR, evidence_claim
from tests.conftest import correct, wrong

LABEL = "Linear equations"


def test_no_answers_below_threshold():
    assert evidence_claim((), 0.31, LABEL) == "Not practised yet"


def test_no_answers_at_or_above_threshold():
    assert evidence_claim((), 0.70, LABEL) == "Steady so far"
    assert evidence_claim((), 0.78, LABEL) == "Steady so far"


def test_all_correct_all_fast():
    got = evidence_claim((correct(5_000), correct(4_000)), 0.5, LABEL)
    assert got == f"2 of last 2 correct {SEPARATOR} ready for a timed question"


def test_all_correct_with_a_slow_one():
    got = evidence_claim((correct(24_000),), 0.42, LABEL)
    assert got == f"1 of last 1 correct {SEPARATOR} slow but accurate"


def test_none_correct_names_the_topic_in_lower_case():
    got = evidence_claim((wrong(), wrong()), 0.2, LABEL)
    assert got == f"0 of last 2 correct {SEPARATOR} needs another linear equations problem"


def test_mixed_is_the_bare_tally():
    got = evidence_claim((correct(5_000), wrong()), 0.4, LABEL)
    assert got == "1 of last 2 correct"


def test_separator_is_middle_dot_not_ascii():
    """U+00B7, not a full stop, hyphen or bullet.

    The goldens encode the exact bytes. A custom JSON encoder that switched to
    ensure_ascii would emit \u00b7 and break parity invisibly.
    """
    assert SEPARATOR == "\u00b7"
    assert ord(SEPARATOR) == 0xB7


def test_a_correct_but_neither_fast_nor_slow_answer_is_a_bare_tally():
    """The gap between the thresholds is reachable and must not claim speed."""
    got = evidence_claim((correct(11_000),), 0.42, LABEL)
    assert got == "1 of last 1 correct"
