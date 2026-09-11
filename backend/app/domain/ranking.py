"""Roadmap ordering and status.

Derived on every read, never stored. That is what guarantees the contract's
"exactly one step has status `next`": it is the first element by construction,
rather than a flag that can drift out of sync with the data.

Ties break on `topic_id` so a row never jitters between two equal positions.

PARITY NOTE. The fixture sorts ties with JavaScript's `a.localeCompare(b)`,
which is ICU-collated; Python's `str` comparison is codepoint order. The two
agree for ids matching ``^[a-z][a-z_]*$`` and can diverge on case or hyphens.
`tests/test_ranking.py` asserts every seeded id matches that pattern, so the
constraint is enforced rather than merely documented.
"""

import re
from typing import Literal

from app.domain.constants import DONE_THRESHOLD

RoadmapStatus = Literal["next", "done", "later"]

TOPIC_ID_PATTERN = re.compile(r"^[a-z][a-z_]*$")


def ranked(mastery: dict[str, float]) -> list[str]:
    """Topic ids, weakest first, ties broken by id."""
    return sorted(mastery, key=lambda topic_id: (mastery[topic_id], topic_id))


def status_for(index: int, mastery: float) -> RoadmapStatus:
    """Index 0 is always `next` — that is the whole guarantee."""
    if index == 0:
        return "next"
    return "done" if mastery >= DONE_THRESHOLD else "later"


def roadmap_signature(steps: list[tuple[str, str, str]]) -> str:
    """Everything the learner can see on the roadmap, as one comparable string.

    Takes (topic_id, status, evidence_claim) triples.

    This drives `roadmap_changed`, which the client uses to decide whether to
    refetch. It must mean "the roadmap changed", not "the order changed" — an
    answer that moves no rows still changes a claim, and reporting False there
    would leave the screen showing something stale.
    """
    return "|".join(f"{topic_id}:{status}:{claim}" for topic_id, status, claim in steps)
