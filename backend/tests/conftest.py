import json
import os
import tempfile
from pathlib import Path

# Point the engine at a throwaway database BEFORE anything imports app.db.base,
# which builds the engine at module import time. Tests must never touch the
# development database.
_TEST_DB = Path(tempfile.gettempdir()) / "ecstacy_test.db"
os.environ.setdefault("DATABASE_URL", f"sqlite+pysqlite:///{_TEST_DB.as_posix()}")

import pytest

from app.domain.evidence import ObservedAnswer, SessionEvidence, TopicEvidence

GOLDEN = Path(__file__).parent / "golden"


def golden(name: str) -> dict:
    """Load a captured fixture response."""
    return json.loads((GOLDEN / f"{name}.json").read_text(encoding="utf-8"))


@pytest.fixture
def seeded():
    """The two-topic graph the goldens were captured from.

    linear_equations 0.31 with `arithmetic` as its prerequisite, arithmetic
    0.38. The gap is under CORRECT_DELTA on purpose — that is what makes a
    single correct answer reorder the roadmap.
    """

    def build(recent: list[ObservedAnswer] | None = None, arithmetic_recent=None):
        return SessionEvidence(
            user_id="demo",
            revision=0,
            focus_topic_id="linear_equations",
            streak=4,
            topics={
                "linear_equations": TopicEvidence(
                    "linear_equations", "Linear equations", "arithmetic", tuple(recent or ())
                ),
                "arithmetic": TopicEvidence(
                    "arithmetic", "Arithmetic", None, tuple(arithmetic_recent or ())
                ),
            },
        )

    return build


def correct(ms: int = 5_000, seq: int = 1) -> ObservedAnswer:
    return ObservedAnswer(correct=True, elapsed_ms=ms, sequence=seq)


def wrong(ms: int = 12_000, seq: int = 1) -> ObservedAnswer:
    return ObservedAnswer(correct=False, elapsed_ms=ms, sequence=seq)


@pytest.fixture
def db():
    """A freshly seeded database, torn down after each test.

    File-based rather than :memory: because sync handlers run in a threadpool
    and each thread gets its own connection; an in-memory database would be
    empty in every thread but the one that seeded it.
    """
    from app.db.base import Base, SessionLocal, engine
    from app.db.seed import init_db

    Base.metadata.drop_all(engine)
    init_db()

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
