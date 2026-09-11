"""Parity against the captured fixture responses.

The highest-value tests here. Everything else checks that the Python does what
the Python intends; these check it does what the FIXTURE does, which is the
thing the cutover depends on.

The goldens were captured by driving the running fixture frontend
(`scripts/capture_goldens.sh`), so the expected values are real bytes rather
than strings transcribed by hand from TypeScript. That distinction is the whole
point: transcription is where parity bugs come from.
"""

import pytest

from app.domain.claims import evidence_claim
from app.domain.evidence import ObservedAnswer, SessionEvidence, TopicEvidence
from app.domain.policy import decide
from app.domain.ranking import ranked, status_for
from tests.conftest import correct, golden, wrong

# The answer sequence that produced each captured scenario. Kept beside the
# assertions so a mismatch is debuggable without re-reading the capture script.
SCENARIOS = {
    "seed_rusty": [],
    "one_correct": [correct(5_000, 1)],
    "one_wrong": [wrong(12_000, 1)],
    "prerequisite_reset": [wrong(12_000, 1), wrong(12_000, 2)],
    "timed_drill": [correct(4_000, 1), correct(4_000, 2)],
    "guided_practice": [correct(24_000, 1)],
}


def _evidence(recent: list[ObservedAnswer]) -> SessionEvidence:
    return SessionEvidence(
        user_id="demo",
        revision=0,
        focus_topic_id="linear_equations",
        streak=4,
        topics={
            "linear_equations": TopicEvidence(
                "linear_equations", "Linear equations", "arithmetic", tuple(recent)
            ),
            "arithmetic": TopicEvidence("arithmetic", "Arithmetic", None, ()),
        },
    )


@pytest.mark.parametrize("scenario", sorted(SCENARIOS))
def test_adaptation_matches_the_fixture(scenario):
    """State, target topic and reason string, all three."""
    expected = golden(f"{scenario}.ask")["adaptation"]
    got = decide(_evidence(SCENARIOS[scenario]))

    assert got.state == expected["state"]
    assert got.topic.topic_id == expected["topic_id"]
    assert got.reason == expected["reason"]


@pytest.mark.parametrize("scenario", sorted(SCENARIOS))
def test_reason_is_byte_identical(scenario):
    """Not merely equal after normalisation.

    Guards the failure mode where a JSON encoder switches to ensure_ascii and
    silently emits escapes instead of the characters themselves.
    """
    expected = golden(f"{scenario}.ask")["adaptation"]["reason"]
    got = decide(_evidence(SCENARIOS[scenario])).reason
    assert got.encode("utf-8") == expected.encode("utf-8")


def test_seed_roadmap_order_and_status_match():
    road = golden("seed_rusty.roadmap")
    mastery = {s["topic_id"]: s["mastery"] for s in road["steps"]}

    order = ranked(mastery)
    assert order == [s["topic_id"] for s in road["steps"]]

    for i, step in enumerate(road["steps"]):
        assert status_for(i, step["mastery"]) == step["status"]


def test_seed_evidence_claims_match():
    road = golden("seed_rusty.roadmap")
    for step in road["steps"]:
        got = evidence_claim((), step["mastery"], step["label"])
        assert got == step["evidence_claim"]


def test_guided_practice_claim_matches_including_the_separator():
    """The middle dot is U+00B7 and the golden proves it."""
    road = golden("guided_practice.roadmap")
    linear = next(s for s in road["steps"] if s["topic_id"] == "linear_equations")
    got = evidence_claim((correct(24_000, 1),), linear["mastery"], linear["label"])
    assert got == linear["evidence_claim"]
    assert got.encode("utf-8") == linear["evidence_claim"].encode("utf-8")


def test_window_boundary_claim_matches():
    """Six answers must produce a claim over the last five only.

    The fixture emitted "4 of last 5 correct" from five correct answers
    followed by one wrong. A backend counting full history would say
    "5 of last 6".
    """
    road = golden("window_boundary.roadmap")
    linear = next(s for s in road["steps"] if s["topic_id"] == "linear_equations")

    recent = tuple([correct(5_000, i) for i in range(1, 6)] + [wrong(12_000, 6)])
    windowed = recent[-5:]

    got = evidence_claim(windowed, linear["mastery"], linear["label"])
    assert got == linear["evidence_claim"]


def test_no_golden_contains_an_em_dash():
    """Product decision, asserted against the captured bytes."""
    import json
    from tests.conftest import GOLDEN

    for path in GOLDEN.glob("*.json"):
        blob = path.read_text(encoding="utf-8")
        assert "—" not in blob, f"em dash in {path.name}"
        assert "–" not in blob, f"en dash in {path.name}"
        json.loads(blob)  # and every golden is still valid JSON
