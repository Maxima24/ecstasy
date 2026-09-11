"""The persistence layer, checked against the captured fixture responses.

These are the tests that prove the database reproduces the fixture, as opposed
to the domain tests which prove the pure functions do.
"""

import pytest

from app.db.models import Answer, Mastery, User
from app.db.seed import DEMO_USER_ID, ensure_user, reset_user
from app.domain.constants import RECENT_WINDOW
from app.services.session_service import (
    build_evidence,
    progress_for,
    record_answer,
    roadmap_for,
)
from tests.conftest import golden

USER = "demo"


def answer(db, correct=True, ms=5_000, topic="linear_equations"):
    return record_answer(db, USER, topic, "linear_transfer_01", 2, correct, ms)


# --- seed state matches the fixture -----------------------------------------


def test_seed_roadmap_matches_golden(db):
    got = roadmap_for(db, USER)
    expected = golden("seed_rusty.roadmap")

    assert [s.topic_id for s in got.steps] == [s["topic_id"] for s in expected["steps"]]
    for mine, theirs in zip(got.steps, expected["steps"], strict=True):
        assert mine.label == theirs["label"]
        assert mine.mastery == pytest.approx(theirs["mastery"])
        assert mine.evidence_claim == theirs["evidence_claim"]
        assert mine.status == theirs["status"]


def test_seed_progress_matches_golden(db):
    got = progress_for(db, USER)
    expected = golden("seed_rusty.progress")

    assert got.streak == expected["streak"]
    assert got.next_action_label == expected["next_action_label"]
    for mine, theirs in zip(got.weakest_topics, expected["weakest_topics"], strict=False):
        assert mine.topic_id == theirs["topic_id"]
        assert mine.evidence_claim == theirs["evidence_claim"]


def test_seed_streak_is_four(db):
    """A judge lands in a populated account, never an empty state."""
    assert progress_for(db, USER).streak == 4


# --- the demo's centrepiece --------------------------------------------------


def test_one_correct_answer_reorders_the_roadmap(db):
    """PRD 18.6. This is the FLIP animation firing on the answer a judge gives."""
    before = [s.topic_id for s in roadmap_for(db, USER).steps]
    assert before[0] == "linear_equations"

    answer(db, correct=True)

    after = [s.topic_id for s in roadmap_for(db, USER).steps]
    assert after[0] == "arithmetic"
    assert after != before


def test_one_correct_answer_matches_the_golden(db):
    answer(db, correct=True, ms=5_000)
    got = roadmap_for(db, USER)
    expected = golden("one_correct.roadmap")

    assert [s.topic_id for s in got.steps] == [s["topic_id"] for s in expected["steps"]]
    for mine, theirs in zip(got.steps, expected["steps"], strict=True):
        assert mine.evidence_claim == theirs["evidence_claim"]
        assert mine.status == theirs["status"]


# --- mastery and streak -----------------------------------------------------


def test_mastery_moves_and_is_persisted(db):
    before, after, _, _ = answer(db, correct=True)
    assert before == pytest.approx(0.31)
    assert after == pytest.approx(0.42)

    row = db.get(Mastery, (USER, "linear_equations"))
    db.refresh(row)
    assert row.value == pytest.approx(0.42)


def test_wrong_answer_lowers_mastery_and_zeroes_the_streak(db):
    before, after, _, streak = answer(db, correct=False, ms=12_000)
    assert after < before
    assert streak == 0


def test_correct_answer_increments_the_streak(db):
    _, _, _, streak = answer(db, correct=True)
    assert streak == 5


# --- roadmap_changed --------------------------------------------------------


def test_claim_only_change_still_reports_roadmap_changed(db):
    """The case everybody gets wrong.

    Answering `arithmetic` correctly moves it from 0.38 to 0.49, which does not
    change the ORDER (linear_equations is still weakest at 0.31) but does change
    the claim. Reporting False here leaves the screen showing stale evidence.
    """
    before = [s.topic_id for s in roadmap_for(db, USER).steps]
    _, _, changed, _ = answer(db, correct=True, topic="arithmetic")
    after = [s.topic_id for s in roadmap_for(db, USER).steps]

    assert after == before, "order should not have changed in this scenario"
    assert changed is True


# --- the answer window ------------------------------------------------------


def test_history_is_kept_in_full_but_read_through_a_window(db):
    for _ in range(RECENT_WINDOW + 3):
        answer(db, correct=True)

    stored = db.query(Answer).filter(Answer.user_id == USER).count()
    assert stored == RECENT_WINDOW + 3, "every answer is stored"

    evidence = build_evidence(db, USER, "linear_equations")
    assert len(evidence.topic("linear_equations").recent) == RECENT_WINDOW


def test_window_boundary_claim_matches_golden(db):
    """Five correct then one wrong must read as 4 of last 5, not 5 of last 6."""
    for _ in range(5):
        answer(db, correct=True, ms=5_000)
    answer(db, correct=False, ms=12_000)

    expected = golden("window_boundary.roadmap")
    linear_expected = next(
        s for s in expected["steps"] if s["topic_id"] == "linear_equations"
    )
    got = next(s for s in roadmap_for(db, USER).steps if s.topic_id == "linear_equations")

    assert got.evidence_claim == linear_expected["evidence_claim"]


# --- invariants -------------------------------------------------------------


def test_exactly_one_next_at_every_point(db):
    for i in range(6):
        assert sum(1 for s in roadmap_for(db, USER).steps if s.status == "next") == 1
        answer(db, correct=i % 2 == 0)


def test_weakest_topics_never_exceeds_three(db):
    assert len(progress_for(db, USER).weakest_topics) <= 3


# --- concurrency-shaped behaviour -------------------------------------------


def test_ensure_user_is_idempotent(db):
    """/ask is called four times per question, concurrently."""
    first = ensure_user(db, "racer")
    second = ensure_user(db, "racer")
    assert first.id == second.id
    assert db.query(User).filter(User.id == "racer").count() == 1


def test_reading_never_mutates_state(db):
    """Every /ask path must be side-effect free."""
    before_answers = db.query(Answer).count()
    before_sequence = db.get(User, USER).sequence if db.get(User, USER) else 0

    for _ in range(4):
        build_evidence(db, USER, "linear_equations")
        roadmap_for(db, USER)
        progress_for(db, USER)

    assert db.query(Answer).count() == before_answers
    user = db.get(User, USER)
    db.refresh(user)
    assert user.sequence == before_sequence


# --- reset ------------------------------------------------------------------


def test_reset_restores_seed_state(db):
    for _ in range(3):
        answer(db, correct=True)
    assert roadmap_for(db, USER).steps[0].topic_id == "arithmetic"

    reset_user(db, USER)

    roadmap = roadmap_for(db, USER)
    assert roadmap.steps[0].topic_id == "linear_equations"
    assert roadmap.steps[0].evidence_claim == "Not practised yet"
    assert progress_for(db, USER).streak == 4
    assert db.query(Answer).filter(Answer.user_id == USER).count() == 0


def test_demo_user_id_constant_matches_what_the_frontend_sends(db):
    assert DEMO_USER_ID == "demo"
