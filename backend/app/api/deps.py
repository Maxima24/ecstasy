"""Shared route dependencies."""

from fastapi import Header, HTTPException

from app.config import settings


def require_token(authorization: str | None = Header(default=None)) -> None:
    """Static bearer check.

    When API_TOKEN is unset, auth is DISABLED rather than failing closed. That
    mirrors the frontend proxy, which omits the Authorization header entirely
    when its own API_TOKEN is unset — so "no token on either side" is a working
    local configuration instead of a 401 loop nobody can debug on demo day.
    """
    expected = settings.api_token
    if not expected:
        return

    if not authorization or not authorization.lower().startswith("bearer "):
        exc = HTTPException(status_code=401, detail="Missing bearer token.")
        exc.code = "unauthorized"  # type: ignore[attr-defined]
        raise exc

    if authorization.split(" ", 1)[1].strip() != expected:
        exc = HTTPException(status_code=401, detail="Invalid bearer token.")
        exc.code = "unauthorized"  # type: ignore[attr-defined]
        raise exc
