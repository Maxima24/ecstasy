"""Engine, session factory, and the SQLite pragmas that matter.

Synchronous on purpose. FastAPI runs `def` handlers in a threadpool, which
removes async session lifecycle, greenlet and aiosqlite from the build
entirely. At demo concurrency the cost is zero, and the failure modes those
libraries introduce are not.
"""

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


engine = create_engine(
    settings.database_url,
    # Sync handlers run in a threadpool, so a connection can legitimately be
    # used from a different thread than the one that created it.
    connect_args={"check_same_thread": False} if _is_sqlite(settings.database_url) else {},
    echo=False,
    future=True,
)


@event.listens_for(Engine, "connect")
def _sqlite_pragmas(dbapi_connection, _record) -> None:
    """Three pragmas, each earning its place.

    `foreign_keys` is OFF by default in SQLite, so without it the prerequisite
    edge and every topic reference would be unenforced decoration.

    `journal_mode=WAL` plus `busy_timeout` is what stops "database is locked"
    under the frontend's prefetch: it fires /ask for all four profiles at once,
    so four concurrent readers alongside an occasional writer is the normal
    case, not a stress test.
    """
    if not _is_sqlite(settings.database_url):
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency. One session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
