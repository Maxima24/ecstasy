"""Behavioural thresholds.

Ported verbatim from ``frontend/src/lib/adaptation/constants.ts`` and
``fixtures/session.ts``. Every behavioural number lives here so the policy
cannot acquire hidden rules across several modules.

These values are demo-tuned, not learning science. They are reproduced exactly
because the captured goldens encode them, and parity with the fixture is what
lets the cutover be a one-line environment change rather than a re-test of the
whole product.
"""

from typing import Final

# --- response speed ---------------------------------------------------------
FAST_RESPONSE_MAX_MS: Final = 8_000
SLOW_RESPONSE_MIN_MS: Final = 15_000

# --- streak lengths ---------------------------------------------------------
REPEATED_MISSES: Final = 2
FAST_CORRECT_STREAK: Final = 2

# --- timers (seconds), applied for the `strong` profile only ----------------
STANDARD_TIMER_SECONDS: Final = 90
COMPRESSED_TIMER_SECONDS: Final = 45

# --- mastery movement -------------------------------------------------------
# Ranking weight only, never presented to the learner as a measurement.
CORRECT_DELTA: Final = 0.11
WRONG_DELTA: Final = -0.05
DONE_THRESHOLD: Final = 0.7

# How many answers per topic the policy may reason about. Older answers are
# still stored; the window is applied on read.
RECENT_WINDOW: Final = 5
