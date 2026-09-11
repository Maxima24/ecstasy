"""Structural checks on the seeded content.

These catch curation mistakes in CI instead of on stage. Every one of them
corresponds to something the contract requires or something the UI would render
wrongly, rather than to a style preference.
"""

import pytest
from sqlalchemy import select

from app.db.models import AudioExplainer, Explainer, Flashcard, Question, Topic
from app.domain.ranking import TOPIC_ID_PATTERN

KINDS = {"guided", "transfer", "timed"}


def topics(db):
    return list(db.execute(select(Topic)).scalars())


def questions(db):
    return list(db.execute(select(Question)).scalars())


# --- topics -----------------------------------------------------------------


def test_every_topic_id_is_collation_safe(db):
    """Python sorts by codepoint; the fixture used ICU collation.

    They agree only for this pattern, so an id like `Linear-Equations` would
    silently order differently in the two implementations.
    """
    for topic in topics(db):
        assert TOPIC_ID_PATTERN.match(topic.id), topic.id


def test_every_prerequisite_resolves(db):
    ids = {t.id for t in topics(db)}
    for topic in topics(db):
        if topic.prerequisite_topic_id:
            assert topic.prerequisite_topic_id in ids, topic.id


def test_no_prerequisite_cycles(db):
    by_id = {t.id: t for t in topics(db)}
    for start in by_id:
        seen, current = set(), start
        while current:
            assert current not in seen, f"cycle through {current}"
            seen.add(current)
            current = by_id[current].prerequisite_topic_id


def test_a_topic_is_not_its_own_prerequisite(db):
    for topic in topics(db):
        assert topic.prerequisite_topic_id != topic.id


def test_at_least_one_topic_has_a_prerequisite(db):
    """Without one, the policy's prerequisite_reset branch is unreachable."""
    assert any(t.prerequisite_topic_id for t in topics(db))


def test_seed_mastery_is_in_range(db):
    for topic in topics(db):
        assert 0.0 <= topic.seed_mastery <= 1.0


def test_the_seeded_gap_stays_under_the_correct_delta(db):
    """The demo's centrepiece depends on this arithmetic.

    PRD 18.6 requires ONE correct answer to reorder the roadmap. That only
    happens if the gap between the weakest topic and the next one is smaller
    than CORRECT_DELTA. Seeding them further apart silently disables the FLIP
    animation, which is exactly what happened once already.
    """
    from app.domain.constants import CORRECT_DELTA

    values = sorted(t.seed_mastery for t in topics(db))
    assert len(values) >= 2
    assert values[1] - values[0] < CORRECT_DELTA, (
        f"gap {values[1] - values[0]:.2f} >= CORRECT_DELTA {CORRECT_DELTA}; "
        "one correct answer would not reorder the roadmap"
    )


# --- questions --------------------------------------------------------------


def test_every_question_has_exactly_five_options(db):
    """The contract says five. The UI lays out five."""
    for q in questions(db):
        assert len(q.options) == 5, q.id


def test_answer_index_is_in_range(db):
    for q in questions(db):
        assert 0 <= q.answer_index <= 4, q.id


def test_options_are_unique_within_a_question(db):
    """Two identical options make one of them unselectable in any meaningful sense."""
    for q in questions(db):
        assert len(set(q.options)) == len(q.options), q.id


def test_every_topic_has_all_three_kinds(db):
    """The policy picks a kind from the instructional state, so a missing kind
    is an unreachable state rather than a degraded one."""
    all_questions = questions(db)
    for topic in topics(db):
        kinds = {q.kind for q in all_questions if q.topic_id == topic.id}
        assert kinds == KINDS, f"{topic.id} has {kinds}"


def test_question_kinds_are_known(db):
    for q in questions(db):
        assert q.kind in KINDS, q.id


def test_every_question_has_a_rationale(db):
    for q in questions(db):
        assert q.rationale.strip(), q.id


def test_every_question_belongs_to_a_real_topic(db):
    ids = {t.id for t in topics(db)}
    for q in questions(db):
        assert q.topic_id in ids, q.id


# --- explainers -------------------------------------------------------------


def test_every_explainer_has_two_to_five_steps(db):
    """The contract's bound. Fewer than two also makes fading meaningless."""
    for e in db.execute(select(Explainer)).scalars():
        assert 2 <= len(e.steps) <= 5, e.id


def test_every_explainer_step_has_text(db):
    for e in db.execute(select(Explainer)).scalars():
        for step in e.steps:
            assert step.get("text", "").strip(), e.id


def test_every_topic_has_an_explainer(db):
    """`rusty` always opens with one, so a missing explainer is a blank screen."""
    covered = {e.topic_id for e in db.execute(select(Explainer)).scalars()}
    assert covered == {t.id for t in topics(db)}


# --- audio and flashcards ---------------------------------------------------


def test_every_topic_has_audio(db):
    """`hands_free` leads with it, and audio_url must be playable when /ask
    responds because the frontend never calls TTS."""
    covered = {a.topic_id for a in db.execute(select(AudioExplainer)).scalars()}
    assert covered == {t.id for t in topics(db)}


def test_every_topic_has_flashcards(db):
    covered = {f.topic_id for f in db.execute(select(Flashcard)).scalars()}
    assert covered == {t.id for t in topics(db)}


# --- copy -------------------------------------------------------------------


@pytest.mark.parametrize("dash", ["—", "–"])
def test_no_dashes_in_seeded_copy(db, dash):
    """Product decision: no em or en dashes in anything a learner reads."""
    for q in questions(db):
        assert dash not in q.stem, q.id
        assert dash not in q.rationale, q.id
        for option in q.options:
            assert dash not in option, q.id

    for e in db.execute(select(Explainer)).scalars():
        assert dash not in e.title, e.id
        for step in e.steps:
            assert dash not in step.get("text", ""), e.id

    for f in db.execute(select(Flashcard)).scalars():
        assert dash not in f.front
        assert dash not in f.back

    for a in db.execute(select(AudioExplainer)).scalars():
        assert dash not in a.script, a.topic_id
