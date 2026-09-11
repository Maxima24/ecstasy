"""Tables.

Two shaping decisions run through all of this.

ORDERING AND STATUS ARE NEVER STORED. There is no `rank`, `status` or `is_next`
column anywhere. They are computed per request from mastery by
`domain/ranking.py`, which is what makes the contract's "exactly one step has
status next" true by construction rather than true until something drifts.

ANSWER HISTORY IS KEPT IN FULL. The five-answer window is applied when the
policy reads, not when an answer is written. Widening it later does not need
rows that were already discarded.
"""

from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(UTC)


class Topic(Base):
    """A subject, and what it depends on.

    `prerequisite_topic_id` is a self-reference, and it is what makes the
    policy's `prerequisite_reset` branch reachable: miss linear equations twice
    and it steps back to arithmetic rather than repeating the same question
    harder.
    """

    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    prerequisite_topic_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("topics.id"), nullable=True
    )
    seed_mastery: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Drives focus-topic resolution from the learner's typed question. Routing,
    # not understanding.
    keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    prerequisite = relationship("Topic", remote_side=[id])


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    # Written ONLY by POST /profile. Never by /ask — the frontend prefetches
    # all four profiles concurrently, so writing it there would be four racing
    # writes with four different values.
    profile: Mapped[str] = mapped_column(String(32), nullable=False, default="rusty")
    streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Monotonic per user; no wall-clock time is needed to order answers.
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Mastery(Base):
    """The only mutable numeric state.

    A ranking weight, never rendered. The UI shows an evidence claim instead,
    because a percentage implies a precision this system has not earned.
    """

    __tablename__ = "mastery"

    user_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    topic_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("topics.id"), primary_key=True
    )
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[str] = mapped_column(String(64), ForeignKey("topics.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(128), nullable=False)
    selected_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # Not telemetry. The policy reads this to tell a confident answer from a
    # laboured one, which is what separates a timed drill from guided practice.
    elapsed_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        # Every read is "this user's recent answers for this topic, newest
        # last", so the index matches the query rather than the column order.
        Index("ix_answers_user_topic_sequence", "user_id", "topic_id", "sequence"),
    )


class Question(Base):
    """A quiz item.

    `kind` is presentational rather than intrinsic: the same item could serve as
    any of the three. The policy picks a kind from the instructional state, and
    `guided` items carry a hand-written hint sentence in the stem.
    """

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    topic_id: Mapped[str] = mapped_column(String(64), ForeignKey("topics.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # guided|transfer|timed
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    stem_expr: Mapped[str | None] = mapped_column(Text, nullable=True)
    options: Mapped[list] = mapped_column(JSON, nullable=False)  # exactly five
    # Shipped to the client so grading is instant and local. The server still
    # grades by question_id on submit — the client's copy is for feedback, not
    # for truth.
    answer_index: Mapped[int] = mapped_column(Integer, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    # Provenance, so "derived from AQuA-RAT" is checkable rather than claimed.
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="curated")
    source_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (Index("ix_questions_topic_kind", "topic_id", "kind", "ord"),)


class Explainer(Base):
    """A worked example.

    Steps live in a JSON column rather than a child table: they are never
    queried individually, their order is positional, and a child table would add
    a join plus an `ord` column that can drift out of sync. The 2-5 constraint
    is enforced by the Pydantic schema at the boundary and by the seed
    integrity test, which is where it belongs.
    """

    __tablename__ = "explainers"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    topic_id: Mapped[str] = mapped_column(String(64), ForeignKey("topics.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    steps: Mapped[list] = mapped_column(JSON, nullable=False)
    citation_chunk_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    citation_label: Mapped[str | None] = mapped_column(String(256), nullable=True)


class AudioExplainer(Base):
    __tablename__ = "audio_explainers"

    topic_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("topics.id"), primary_key=True
    )
    script: Mapped[str] = mapped_column(Text, nullable=False)
    # Must be playable by the time /ask responds. The frontend never calls TTS.
    audio_path: Mapped[str] = mapped_column(String(256), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[str] = mapped_column(String(64), ForeignKey("topics.id"), nullable=False)
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("topic_id", "front", name="uq_flashcard_topic_front"),)


class Meta(Base):
    """Key/value, holding the schema version. See `db/schema_version.py`."""

    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(256), nullable=False)
