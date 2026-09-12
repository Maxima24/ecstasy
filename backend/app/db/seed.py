"""Seed and schema-version guard.

No Alembic. One deployer, one branch, disposable demo state, and the JSON files
are the real source of truth — migrations would cost a day of setup plus a
revision on every schema change during the week the schema is most volatile.

What replaces it is smaller and catches the failure that actually bites: a
stale database after a model change, surfacing at 2am as
`OperationalError: no such column`. A version constant in code is compared
against one stored in the database; a mismatch drops and recreates everything.
Every schema change is then a one-line bump.
"""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base, SessionLocal, engine
from app.db.models import (
    AudioExplainer,
    Explainer,
    Flashcard,
    Mastery,
    Meta,
    Question,
    Topic,
    User,
)

# Bump on ANY model change. A mismatch rebuilds the database from scratch.
SCHEMA_VERSION = "1"
SCHEMA_KEY = "schema_version"

DATA = Path(__file__).resolve().parent.parent / "data"
DEMO_USER_ID = "demo"
DEFAULT_STREAK = 4
"""A judge lands in a populated account, never an empty state (PRD DoD step 1)."""


def _load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def _stored_version(db: Session) -> str | None:
    row = db.get(Meta, SCHEMA_KEY)
    return row.value if row else None


def init_db(*, allow_destructive: bool = True) -> None:
    """Create tables, rebuilding if the stored schema version is stale."""
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        stored = _stored_version(db)
        if stored is not None and stored != SCHEMA_VERSION and allow_destructive:
            db.close()
            Base.metadata.drop_all(engine)
            Base.metadata.create_all(engine)
            stored = None

        with SessionLocal() as fresh:
            if _stored_version(fresh) is None:
                fresh.merge(Meta(key=SCHEMA_KEY, value=SCHEMA_VERSION))
                fresh.commit()

    seed_content()


def seed_content() -> None:
    """Upsert topics and materials. Idempotent, so editing JSON and restarting
    is enough. Learner state is deliberately NOT touched here."""
    topics = _load("topics.json")
    materials = _load("materials.json")

    with SessionLocal() as db:
        # Topics first: everything else references them, and the prerequisite
        # edge is a real foreign key with PRAGMA foreign_keys=ON.
        for t in topics:
            db.merge(
                Topic(
                    id=t["topic_id"],
                    label=t["label"],
                    prerequisite_topic_id=None,
                    seed_mastery=t["seed_mastery"],
                    keywords=t.get("keywords", []),
                )
            )
        db.commit()

        # Prerequisites in a second pass, so a forward reference to a topic
        # that has not been inserted yet cannot fail.
        for t in topics:
            if t.get("prerequisite_topic_id"):
                topic = db.get(Topic, t["topic_id"])
                if topic:
                    topic.prerequisite_topic_id = t["prerequisite_topic_id"]
        db.commit()

        for topic_id, material in materials.items():
            explainer = material["explainer"]
            citation = explainer.get("citation") or {}
            db.merge(
                Explainer(
                    id=f"{topic_id}_explainer",
                    topic_id=topic_id,
                    title=explainer["title"],
                    steps=explainer["steps"],
                    citation_chunk_id=citation.get("chunk_id"),
                    citation_label=citation.get("label"),
                )
            )

            db.merge(
                AudioExplainer(
                    topic_id=topic_id,
                    script=material["audio_script"],
                    audio_path="/fixture-silence.wav",
                    duration_ms=2_000,
                )
            )

            for kind, q in material["questions"].items():
                db.merge(
                    Question(
                        id=q["id"],
                        topic_id=topic_id,
                        kind=kind,
                        stem=q["stem"],
                        stem_expr=q.get("stem_expr"),
                        options=q["options"],
                        answer_index=q["answer_index"],
                        rationale=q["rationale"],
                        source=q.get("source", "curated"),
                        source_ref=q.get("source_ref"),
                        ord=0,
                    )
                )

            existing = {
                f
                for (f,) in db.execute(
                    select(Flashcard.front).where(Flashcard.topic_id == topic_id)
                )
            }
            for i, card in enumerate(material["flashcards"]):
                if card["front"] not in existing:
                    db.add(
                        Flashcard(
                            topic_id=topic_id,
                            front=card["front"],
                            back=card["back"],
                            ord=i,
                        )
                    )

        seed_aqua_questions(db)
        db.commit()


def seed_aqua_questions(db: Session) -> None:
    """Load the verified AQuA-RAT derived questions, if present.

    Optional by design: the file is produced by scripts/curate_aqua.py plus
    scripts/verify_aqua.py, and the service must still seed and run without it.

    These give question rotation something to rotate. With only the curated
    items there was exactly one question per (topic, kind), so answering handed
    the learner the same item straight back.

    `ord` starts at 1 so the hand-written curated item stays first and the
    rehearsed demo screen does not change.
    """
    path = DATA / "aqua_questions.json"
    if not path.exists():
        return

    for i, q in enumerate(json.loads(path.read_text(encoding="utf-8")), start=1):
        if db.get(Topic, q["topic_id"]) is None:
            continue
        db.merge(
            Question(
                id=q["id"],
                topic_id=q["topic_id"],
                kind=q["kind"],
                stem=q["stem"],
                stem_expr=None,  # AQuA-RAT carries no TeX; never guess it
                options=q["options"],
                answer_index=q["answer_index"],
                rationale=q["rationale"],
                source=q.get("source", "aqua-rat"),
                source_ref=q.get("source_ref"),
                ord=i,
            )
        )


def ensure_user(db: Session, user_id: str) -> User:
    """Get or create, safe under concurrency.

    /ask is called four times per question — the frontend prefetches the other
    three profiles as soon as the first lands — so first-touch user creation
    races four ways. A failed insert here means somebody else won, which is a
    success, not an error.
    """
    user = db.get(User, user_id)
    if user is not None:
        return user

    user = User(id=user_id, profile="rusty", streak=DEFAULT_STREAK, sequence=0)
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        existing = db.get(User, user_id)
        if existing is None:
            raise
        user = existing

    # Unconditionally, not only on the branch that created the user.
    #
    # The user row commits before its mastery rows exist, so a concurrent
    # request could see the user, skip straight past this, and build a roadmap
    # from an empty mastery map. Pydantic then rejected the block for having
    # zero steps and the request 500ed. With four concurrent /ask calls on a
    # fresh user - which is exactly what the frontend's prefetch does on first
    # load - that was reliably reproducible.
    seed_mastery_for(db, user_id)
    return user


def seed_mastery_for(db: Session, user_id: str) -> None:
    """Give a user the seeded starting point for every topic.

    Idempotent and safe to lose the race: a concurrent caller inserting the same
    row first is a success, not an error, so the IntegrityError is swallowed and
    the existing row stands.
    """
    missing = [
        topic
        for topic in db.execute(select(Topic)).scalars()
        if db.get(Mastery, (user_id, topic.id)) is None
    ]
    if not missing:
        return

    for topic in missing:
        db.add(Mastery(user_id=user_id, topic_id=topic.id, value=topic.seed_mastery))
    try:
        db.commit()
    except Exception:
        db.rollback()


def reset_user(db: Session, user_id: str) -> None:
    """Restore a user to seed state.

    The fixture reset on process restart; a real database does not, so after two
    rehearsals the demo account is dirty. Reachable only with a bearer token and
    deliberately absent from the frontend's proxy routes.
    """
    from app.db.models import Answer

    db.query(Answer).filter(Answer.user_id == user_id).delete()
    db.query(Mastery).filter(Mastery.user_id == user_id).delete()
    user = db.get(User, user_id)
    if user is not None:
        user.streak = DEFAULT_STREAK
        user.sequence = 0
    db.commit()
    seed_mastery_for(db, user_id)
