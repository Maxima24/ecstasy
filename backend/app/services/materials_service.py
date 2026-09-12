"""Content lookup: questions, explainers, audio, flashcards.

Selection must be DETERMINISTIC for a given evidence state. The frontend
prefetches the other three profiles the moment the first /ask lands, so this is
called four times concurrently for one question — if the choice varied, flipping
profiles would silently change the question on screen.

The rotation key is therefore the answer count, not randomness and not a clock:
same evidence gives the same question to all four profiles, and a fresh question
arrives only once the learner has actually answered.
"""

import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AudioExplainer, Explainer, Flashcard, Question, Topic
from app.schemas.blocks import (
    AudioExplainerBlock,
    Citation,
    ExplainerCardBlock,
    ExplainerStep,
    Flashcard as FlashcardSchema,
    FlashcardsBlock,
    QuizQuestion,
)

QuestionKind = str  # guided | transfer | timed


def _stable_index(*parts: str | int, modulo: int) -> int:
    """A hash that survives a restart.

    Python's built-in hash() is salted per process, so using it here would serve
    a different question after every restart and make a rehearsed demo
    unrepeatable.
    """
    if modulo <= 0:
        return 0
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % modulo


def question_for(
    db: Session,
    topic_id: str,
    kind: QuestionKind,
    rotation: int = 0,
) -> QuizQuestion:
    """One question of the requested kind.

    `rotation` is the learner's answer count for the topic, so the item changes
    after each answer but is identical across the four concurrent profile
    prefetches.
    """
    rows = list(
        db.execute(
            select(Question)
            .where(Question.topic_id == topic_id, Question.kind == kind)
            .order_by(Question.ord, Question.id)
        ).scalars()
    )
    if not rows:
        # Fall back to any question for the topic rather than emitting a
        # malformed block. A missing kind is caught by test_seed_integrity.
        rows = list(
            db.execute(
                select(Question).where(Question.topic_id == topic_id).order_by(Question.id)
            ).scalars()
        )
    if not rows:
        raise LookupError(f"no questions seeded for topic {topic_id!r}")

    # A learner who has not answered yet always gets the lowest-`ord` item,
    # which is the hand-written curated one. That keeps the opening screen of a
    # rehearsed demo identical every run; rotation only starts once the learner
    # has actually done something, which is also when a fresh question is the
    # point.
    index = 0 if rotation == 0 else _stable_index(topic_id, kind, rotation, modulo=len(rows))
    row = rows[index]
    return QuizQuestion(
        id=row.id,
        stem=row.stem,
        stem_expr=row.stem_expr,
        options=list(row.options),
        topic_id=row.topic_id,
        answer_index=row.answer_index,
        rationale=row.rationale,
    )


def explainer_for(db: Session, topic_id: str, fade: bool = False) -> ExplainerCardBlock:
    """A worked example, optionally backward-faded.

    `fade` withholds the final step's result. Reserved for a learner who
    answered correctly but slowly: they can already do it, so completing the
    example beats reading it.
    """
    row = db.execute(
        select(Explainer).where(Explainer.topic_id == topic_id)
    ).scalars().first()
    if row is None:
        raise LookupError(f"no explainer seeded for topic {topic_id!r}")

    steps = [
        ExplainerStep(text=s["text"], expr=s.get("expr"), faded=False) for s in row.steps
    ]
    # Fade the LAST step only, and only when there is something left unfaded
    # above it to scaffold from.
    if fade and len(steps) >= 2:
        steps[-1] = ExplainerStep(text=steps[-1].text, expr=steps[-1].expr, faded=True)

    citation = (
        Citation(chunk_id=row.citation_chunk_id, label=row.citation_label)
        if row.citation_chunk_id and row.citation_label
        else None
    )
    return ExplainerCardBlock(title=row.title, steps=steps, citation=citation)


def audio_for(db: Session, topic_id: str, base_url: str) -> AudioExplainerBlock:
    row = db.get(AudioExplainer, topic_id)
    if row is None:
        raise LookupError(f"no audio seeded for topic {topic_id!r}")

    path = row.audio_path
    url = path if path.startswith("http") else f"{base_url.rstrip('/')}{path}"
    return AudioExplainerBlock(
        script=row.script,
        audio_url=url,
        duration_ms=row.duration_ms,
        transcript_shown=False,
    )


def flashcards_for(db: Session, topic_id: str) -> FlashcardsBlock:
    rows = list(
        db.execute(
            select(Flashcard).where(Flashcard.topic_id == topic_id).order_by(Flashcard.ord, Flashcard.id)
        ).scalars()
    )
    if not rows:
        raise LookupError(f"no flashcards seeded for topic {topic_id!r}")
    return FlashcardsBlock(
        cards=[
            FlashcardSchema(front=r.front, back=r.back, topic_id=r.topic_id) for r in rows
        ]
    )


def resolve_focus_topic(db: Session, question: str, default_topic_id: str) -> str:
    """Which topic the learner's typed question is about.

    Keyword matching, longest keyword first. This is ROUTING, not understanding,
    and saying so plainly is better than dressing it up.

    An unmatched question falls back to the configured default rather than to
    the weakest topic: someone typing something unrelated should land on the
    rehearsed screen, not a surprise one.
    """
    text = question.lower()
    best: tuple[int, str] | None = None

    for topic in db.execute(select(Topic)).scalars():
        for keyword in topic.keywords or []:
            k = str(keyword).lower()
            if k and k in text and (best is None or len(k) > best[0]):
                best = (len(k), topic.id)

    if best is not None:
        return best[1]

    if db.get(Topic, default_topic_id) is not None:
        return default_topic_id

    first = db.execute(select(Topic).order_by(Topic.id)).scalars().first()
    if first is None:
        raise LookupError("no topics seeded")
    return first.id
