"""Settings, read from the environment.

Deliberately stdlib rather than pydantic-settings: four values do not justify a
dependency, and every one of them has a working default so the service starts
with no environment at all.
"""

import os


def _csv(name: str, default: str) -> list[str]:
    return [part.strip() for part in os.getenv(name, default).split(",") if part.strip()]


class Settings:
    # SQLite by default. Switching to Postgres is this string plus a driver —
    # nothing in the models is dialect-specific.
    database_url: str = os.getenv("DATABASE_URL", "sqlite+pysqlite:///./ecstacy.db")

    # When unset, auth is disabled. This mirrors the frontend proxy, which omits
    # the Authorization header entirely when API_TOKEN is unset — so "no token
    # on either side" is a working local configuration rather than a 401 loop.
    api_token: str | None = os.getenv("API_TOKEN") or None

    # Server-to-server calls carry no preflight, so this matters only for
    # Swagger UI and direct curl.
    cors_origins: list[str] = _csv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000")

    # Where audio files are served from, for absolute audio_url values.
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")


settings = Settings()
