"""Shortlist AQuA-RAT candidates for human review.

DEV-TIME ONLY. Nothing here runs in the request path; its output is a shortlist
a person reads, edits and promotes into app/data/materials.json.

AQuA-RAT (google-deepmind/AQuA, Apache-2.0) gives ~100k algebraic word problems
as {question, options: ["A)21", ...], rationale, correct: "A"}.

WHAT THIS DATASET ACTUALLY IS, measured rather than assumed. Of 97,467 training
records, only 156 (0.16%) contain a bare equation like "3x + 5 = 20", and every
one sampled was a quadratic. But 1,448 are "find the number" word problems,
which are solved by setting up and solving a linear equation.

So `linear_equations` here means "solved with a linear equation", which is both
what the data actually contains and closer to what the GRE tests than a bare
drill is.

`arithmetic` is deliberately absent. Our arithmetic items are pure computation
("31 - 7") and AQuA has effectively none, so those stay hand-written rather than
approximated from an ill-fitting source.

What the dataset also does not give, and what therefore stays manual:

* TEX. There is none, so ingested items keep stem_expr null rather than a
  guessed conversion. TeX stays in the hand-written explainers, where it is
  correct.
* STEP STRUCTURE. Rationales are crowd-written prose, frequently ending
  "Answer is C" and occasionally wrong. They are never used to build explainers:
  a broken worked example is the most visible possible failure in a learning
  demo.

Usage:
    uv run python scripts/curate_aqua.py --limit 40
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".aqua"
OUT = RAW / "shortlist.json"

LETTERS = "ABCDE"
MAX_STEM_CHARS = 180
"""Longer stems are clamped by the UI and read badly on a 375px screen."""

TOPIC_PATTERNS: dict[str, list[str]] = {
    "linear_equations": [
        r"find the number",
        r"what is the number",
        r"twice a number",
        r"\ba number is\b",
        r"\bthe number is\b",
    ],
}

# A pattern match is not enough; these have the final say. The first pass showed
# why: with naive rules, four of five candidates were misfiled as linear
# equations when they were quadratics, coordinate geometry or proportions.
EXCLUDE: dict[str, list[str]] = {
    "linear_equations": [
        r"\^\s*2|squared|quadratic|\broot\b|cube",
        r"coordinate|slope|perimeter|\barea\b|triangle|circle",
        r"probability|permutation|combination",
        r"speed|km/h|per hour|interest|profit",
        r"%|percent",  # "percent" alone missed the symbol form
        r"sqrt|logarithm",
        r"consecutive",  # usually needs a system, not a single equation
        r"remainder|divisible|prime",
        # False friends found by reading the first shortlist. "Find the number
        # OF factors" is number theory, not a linear equation, and it matched
        # the "find the number" rule cleanly. So did "odd one out", which is a
        # pattern-spotting puzzle with no equation in it at all.
        r"find the number of|number of factors|divisors|odd one out",
        r"how many|number of ways|number of digits",
    ],
}

# Stems referencing something the learner cannot see.
UNRENDERABLE = re.compile(
    r"\b(figure|diagram|graph|table|shown above|following table|picture)\b", re.I
)


def normalise(record: dict) -> dict | None:
    """One raw record to our shape, or None if it cannot be trusted."""
    options = record.get("options") or []
    if len(options) != 5:
        return None

    letter = (record.get("correct") or "").strip().upper()
    if letter not in LETTERS:
        return None

    # Options arrive prefixed: "A)21", sometimes "A ) 21" or "A.21".
    cleaned = []
    for i, raw in enumerate(options):
        text = re.sub(rf"^\s*{LETTERS[i]}\s*[).\]]\s*", "", str(raw)).strip()
        if not text:
            return None
        cleaned.append(text)

    if len(set(cleaned)) != len(cleaned):
        return None  # a duplicate option makes one of them meaningless

    stem = " ".join(str(record.get("question", "")).split())
    # The dataset frequently omits the space after a full stop
    # ("...is 11.What is the number?"). Harmless in a corpus, visibly sloppy on
    # a screen someone is being asked to learn from.
    stem = re.sub(r"([.?!])([A-Z])", r"\1 \2", stem)
    if not stem or len(stem) > MAX_STEM_CHARS or UNRENDERABLE.search(stem):
        return None

    rationale = " ".join(str(record.get("rationale", "")).split())
    if not rationale:
        return None

    return {
        "stem": stem,
        "stem_expr": None,
        "options": cleaned,
        "answer_index": LETTERS.index(letter),
        "rationale": rationale,
        "source": "aqua-rat",
    }


def topic_for(stem: str) -> str | None:
    """Classify, then veto."""
    lowered = stem.lower()
    for topic_id, patterns in TOPIC_PATTERNS.items():
        if not any(re.search(p, lowered) for p in patterns):
            continue
        if any(re.search(p, lowered) for p in EXCLUDE.get(topic_id, [])):
            continue
        return topic_id
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=40, help="candidates per topic")
    args = parser.parse_args()

    buckets: dict[str, list[dict]] = {t: [] for t in TOPIC_PATTERNS}
    seen: set[str] = set()
    scanned = rejected = matched = vetoed = 0

    for split in ("train", "test", "dev"):
        path = RAW / f"{split}.json"
        if not path.exists():
            continue
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines()):
            line = line.strip()
            if not line:
                continue
            scanned += 1
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                rejected += 1
                continue

            item = normalise(record)
            if item is None:
                rejected += 1
                continue

            lowered = item["stem"].lower()
            hit = any(re.search(p, lowered) for p in TOPIC_PATTERNS["linear_equations"])
            if hit:
                matched += 1

            topic_id = topic_for(item["stem"])
            if topic_id is None:
                if hit:
                    vetoed += 1
                continue
            if item["stem"] in seen:
                continue

            seen.add(item["stem"])
            item["source_ref"] = f"{split}:{line_no}"
            item["topic_id"] = topic_id
            buckets[topic_id].append(item)

    for topic_id in buckets:
        # Shortest first: the smallest clean item reads best on a phone and
        # makes the best `timed` candidate.
        buckets[topic_id].sort(key=lambda i: len(i["stem"]))
        buckets[topic_id] = buckets[topic_id][: args.limit]

    OUT.write_text(json.dumps(buckets, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"scanned {scanned:,}, unusable {rejected:,}")
    print(f"pattern-matched {matched:,}, vetoed by exclusions {vetoed:,}")
    for topic_id, items in buckets.items():
        print(f"  {topic_id:20} {len(items)} shortlisted")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
