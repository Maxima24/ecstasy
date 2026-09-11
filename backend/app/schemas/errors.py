"""The error envelope the frontend actually reads.

FastAPI's default is ``{"detail": ...}``. The frontend's ``request()`` in
``src/lib/api.ts`` reads ``body.error`` — either a string or an object with
``.message``. Left alone, every backend error would surface to the learner as
the generic "Something went wrong", losing the message entirely.

The shape below is the one documented in FRONTEND_PLAN §4.
"""

from pydantic import BaseModel, ConfigDict, Field


class ApiErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(description="Stable, machine-readable. e.g. 'question_not_found'.")
    message: str = Field(description="Learner-facing. States what happened and what to do.")
    retryable: bool = Field(
        description="Whether trying the same request again could plausibly succeed."
    )


class ApiError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ApiErrorBody
