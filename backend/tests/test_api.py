"""HTTP surface.

Thin on purpose: the decisions are tested in the domain and service suites.
What these assert is the wire contract — status codes, the error envelope, the
204 with no body, and the shapes the frontend parses.
"""

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base, engine
from app.db.seed import init_db
from app.main import app

QUESTION = "If 3x + 5 = 20, what is x?"


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    init_db()
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)


def ask(client, profile="rusty", user_id="demo"):
    return client.post("/ask", json={"user_id": user_id, "profile": profile, "question": QUESTION})


def submit(client, question_id, selected_index, elapsed_ms=5_000, user_id="demo", topic_id="linear_equations"):
    return client.post(
        "/quiz/submit",
        json={
            "user_id": user_id,
            "question_id": question_id,
            "topic_id": topic_id,
            "selected_index": selected_index,
            "elapsed_ms": elapsed_ms,
        },
    )


def wrong_index(question: dict) -> int:
    """An index that is definitely not the answer.

    Hardcoding 0 worked only while every seeded question happened to have a
    non-zero answer_index. With a varied question bank that assumption silently
    became "answer correctly", and two tests started asserting a state the
    learner had not earned.
    """
    return (question["answer_index"] + 1) % 5


# --- health -----------------------------------------------------------------


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --- ask --------------------------------------------------------------------


@pytest.mark.parametrize("profile", ["rusty", "time_poor", "hands_free", "strong"])
def test_ask_returns_a_valid_screen_for_every_profile(client, profile):
    r = ask(client, profile)
    assert r.status_code == 200, r.text

    body = r.json()
    assert 1 <= len(body["blocks"]) <= 5
    assert body["adaptation"]["state"]
    assert body["adaptation"]["reason"]


def test_ask_adaptation_topic_is_present_in_the_roadmap(client):
    """The UI highlights that row, so a topic_id absent from the roadmap would
    mark nothing and the explanation would point at empty space."""
    body = ask(client).json()
    roadmap = next(b for b in body["blocks"] if b["type"] == "roadmap")
    assert body["adaptation"]["topic_id"] in {s["topic_id"] for s in roadmap["steps"]}


def test_ask_is_side_effect_free(client):
    """Called four times per question by the frontend's prefetch."""
    first = ask(client).json()
    for profile in ("time_poor", "hands_free", "strong"):
        ask(client, profile)
    again = ask(client).json()

    assert first["adaptation"] == again["adaptation"]
    assert client.get("/roadmap?user_id=demo").json() == first_roadmap(first)


def first_roadmap(body):
    return next(b for b in body["blocks"] if b["type"] == "roadmap")


def test_all_profiles_get_the_same_question(client):
    """Otherwise flipping profiles silently swaps the question on screen."""
    ids = set()
    for profile in ("rusty", "time_poor", "hands_free", "strong"):
        body = ask(client, profile).json()
        quiz = next((b for b in body["blocks"] if b["type"] == "quiz"), None)
        if quiz:
            ids.add(quiz["questions"][0]["id"])
    assert len(ids) == 1, ids


def test_timer_is_reserved_for_strong(client):
    for profile in ("rusty", "time_poor", "hands_free"):
        body = ask(client, profile).json()
        quiz = next((b for b in body["blocks"] if b["type"] == "quiz"), None)
        if quiz:
            assert quiz["timer_seconds"] is None, profile

    body = ask(client, "strong").json()
    quiz = next(b for b in body["blocks"] if b["type"] == "quiz")
    assert quiz["timer_seconds"] is not None


def test_rusty_opens_with_an_explainer(client):
    """The invariant clamps rusty to the FIRST block, so ordering decides what
    survives."""
    body = ask(client, "rusty").json()
    assert body["blocks"][0]["type"] == "explainer_card"


def test_hands_free_leads_with_audio(client):
    body = ask(client, "hands_free").json()
    assert body["blocks"][0]["type"] == "audio_explainer"
    assert body["blocks"][0]["audio_url"]


def test_time_poor_leads_with_the_roadmap(client):
    body = ask(client, "time_poor").json()
    assert body["blocks"][0]["type"] == "roadmap"


def test_roadmap_block_has_exactly_one_next(client):
    body = ask(client).json()
    roadmap = first_roadmap(body)
    assert sum(1 for s in roadmap["steps"] if s["status"] == "next") == 1


def test_every_roadmap_step_carries_a_claim(client):
    """The UI renders the claim INSTEAD of mastery, so an empty one is a blank row."""
    for step in first_roadmap(ask(client).json())["steps"]:
        assert step["evidence_claim"].strip()


# --- the adaptation branches, over HTTP -------------------------------------


def test_wrong_answer_leads_to_worked_transfer(client):
    q = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")["questions"][0]
    submit(client, q["id"], selected_index=wrong_index(q), elapsed_ms=12_000)
    assert ask(client).json()["adaptation"]["state"] == "worked_transfer"


def test_two_misses_reset_to_the_prerequisite(client):
    for _ in range(2):
        q = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")["questions"][0]
        submit(client, q["id"], wrong_index(q), 12_000)

    body = ask(client).json()
    assert body["adaptation"]["state"] == "prerequisite_reset"
    assert body["adaptation"]["topic_id"] == "arithmetic"


def test_slow_correct_answer_fades_the_last_explainer_step(client):
    quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
    q = quiz["questions"][0]
    submit(client, q["id"], q["answer_index"], elapsed_ms=24_000)

    body = ask(client).json()
    assert body["adaptation"]["state"] == "guided_practice"
    explainer = next(b for b in body["blocks"] if b["type"] == "explainer_card")
    assert explainer["steps"][-1]["faded"] is True
    assert all(not s["faded"] for s in explainer["steps"][:-1])


# --- quiz/submit ------------------------------------------------------------


def test_submit_grades_by_question_id_not_by_the_client(client):
    quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
    q = quiz["questions"][0]

    r = submit(client, q["id"], selected_index=q["answer_index"])
    assert r.status_code == 200
    body = r.json()
    assert body["correct"] is True
    assert body["answer_index"] == q["answer_index"]
    assert body["mastery"]["after"] > body["mastery"]["before"]


def test_submit_rejects_an_unknown_question(client):
    r = submit(client, "no_such_question", 0)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "question_not_found"


def test_one_correct_answer_reorders_the_roadmap(client):
    before = [s["topic_id"] for s in client.get("/roadmap?user_id=demo").json()["steps"]]
    quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
    q = quiz["questions"][0]

    r = submit(client, q["id"], q["answer_index"])
    assert r.json()["roadmap_changed"] is True

    after = [s["topic_id"] for s in client.get("/roadmap?user_id=demo").json()["steps"]]
    assert after != before


# --- roadmap / progress -----------------------------------------------------


def test_roadmap_returns_a_bare_block(client):
    body = client.get("/roadmap?user_id=demo").json()
    assert body["type"] == "roadmap"


def test_progress_returns_a_bare_block(client):
    body = client.get("/progress?user_id=demo").json()
    assert body["type"] == "progress_panel"
    assert body["streak"] == 4
    assert len(body["weakest_topics"]) <= 3


def test_user_id_defaults_to_demo(client):
    assert client.get("/roadmap").status_code == 200


# --- profile ----------------------------------------------------------------


def test_profile_returns_204_with_an_empty_body(client):
    r = client.post("/profile", json={"user_id": "demo", "profile": "strong"})
    assert r.status_code == 204
    assert r.content == b""


def test_profile_rejects_an_unknown_value(client):
    r = client.post("/profile", json={"user_id": "demo", "profile": "nope"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_request"


# --- error envelope ---------------------------------------------------------


def test_validation_error_uses_the_frontend_envelope(client):
    """FastAPI's default is {"detail": ...}; the frontend reads body.error.message.

    Left alone, every backend error would surface as the generic
    "Something went wrong".
    """
    r = client.post("/ask", json={"user_id": "d", "profile": "nope", "question": "x"})
    assert r.status_code == 422

    body = r.json()
    assert set(body["error"]) == {"code", "message", "retryable"}
    assert body["error"]["retryable"] is False
    assert "profile" in body["error"]["message"]


# --- admin ------------------------------------------------------------------


def test_reset_restores_seed_state(client):
    quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
    q = quiz["questions"][0]
    submit(client, q["id"], q["answer_index"])

    assert client.post("/admin/reset?user_id=demo").status_code == 204

    roadmap = client.get("/roadmap?user_id=demo").json()
    assert roadmap["steps"][0]["topic_id"] == "linear_equations"
    assert roadmap["steps"][0]["evidence_claim"] == "Not practised yet"


# --- copy -------------------------------------------------------------------


def test_no_em_dash_anywhere_in_a_response(client):
    for profile in ("rusty", "time_poor", "hands_free", "strong"):
        raw = ask(client, profile).text
        assert "—" not in raw
        assert "–" not in raw


def test_unicode_is_emitted_raw_not_escaped(client):
    """Starlette uses ensure_ascii=False. A custom encoder that changed that
    would emit \\u00b7 and break byte parity with the fixture."""
    quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
    q = quiz["questions"][0]
    submit(client, q["id"], q["answer_index"], elapsed_ms=24_000)

    raw = client.get("/roadmap?user_id=demo").content
    assert "·".encode("utf-8") in raw


# --- concurrency ------------------------------------------------------------


def test_concurrent_ask_on_a_fresh_user(client):
    """The frontend's prefetch, reproduced.

    On first load it fires /ask for all four profiles at once against a user
    that does not exist yet. The user row commits before its mastery rows do, so
    a request arriving in that window used to see the user, skip seeding, build
    a roadmap from an empty mastery map, and 500 on the contract's minimum of
    one step. One of four requests failed, reliably.
    """
    from concurrent.futures import ThreadPoolExecutor

    user_id = "fresh_concurrent_user"
    profiles = ["rusty", "time_poor", "hands_free", "strong"]

    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(
                lambda p: client.post(
                    "/ask", json={"user_id": user_id, "profile": p, "question": QUESTION}
                ),
                profiles,
            )
        )

    for profile, r in zip(profiles, responses, strict=True):
        assert r.status_code == 200, f"{profile}: {r.status_code} {r.text[:200]}"
        assert len(r.json()["blocks"]) >= 1

    # And exactly one set of mastery rows, not four.
    roadmap = client.get(f"/roadmap?user_id={user_id}").json()
    assert len(roadmap["steps"]) == 2
    assert {s["topic_id"] for s in roadmap["steps"]} == {"linear_equations", "arithmetic"}


def test_roadmap_survives_missing_mastery_rows(client):
    """A missing row degrades to "as if unpractised", never to zero steps."""
    from app.db.base import SessionLocal
    from app.db.models import Mastery

    client.get("/roadmap?user_id=gappy")
    with SessionLocal() as db:
        db.query(Mastery).filter(Mastery.user_id == "gappy").delete()
        db.commit()

    r = client.get("/roadmap?user_id=gappy")
    assert r.status_code == 200
    steps = r.json()["steps"]
    assert len(steps) == 2
    assert sum(1 for s in steps if s["status"] == "next") == 1


def test_first_question_is_always_the_curated_one(client):
    """A rehearsed demo must open on the same screen every run.

    Rotation is keyed on the learner's answer count, so at zero it would
    otherwise hash to an arbitrary item and the opening question would change
    between takes. The curated item has the lowest `ord`.
    """
    ids = set()
    for i in range(3):
        body = ask(client, user_id=f"opener_{i}").json()
        quiz = next(b for b in body["blocks"] if b["type"] == "quiz")
        ids.add(quiz["questions"][0]["id"])

    assert len(ids) == 1, ids
    assert not ids.pop().startswith("aqua_"), "a fresh learner should get the curated item"


def test_rotation_serves_a_different_question_after_answering(client):
    """With one question per (topic, kind) this was a no-op: answering handed
    the learner the same item straight back."""
    seen = []
    for _ in range(4):
        quiz = next(b for b in ask(client).json()["blocks"] if b["type"] == "quiz")
        q = quiz["questions"][0]
        seen.append(q["id"])
        submit(client, q["id"], q["answer_index"], elapsed_ms=4_000)

    assert len(set(seen)) > 1, f"no rotation: {seen}"
