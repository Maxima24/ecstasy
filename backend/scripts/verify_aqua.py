"""Arithmetically verify shortlisted candidates, and promote only the survivors.

AQuA-RAT answers are crowd-written and some are simply wrong. Reading the first
shortlist turned up "15 times a number gives 150" with the answer marked 15,
when 15 x 15 = 225 and the correct value is not even among the options.

Shipping that to a learner in a product that claims to teach is worse than
shipping fewer questions, so nothing reaches the seed file unless the maths
checks out here.

Verification is per template and deliberately narrow: a template this script
does not recognise is REJECTED rather than trusted. Coverage is not the goal;
being unable to ship a wrong answer is.

Usage:
    uv run python scripts/verify_aqua.py            # report
    uv run python scripts/verify_aqua.py --promote  # write app/data/aqua_questions.json
"""

import argparse
import json
import re
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHORTLIST = ROOT / ".aqua" / "shortlist.json"
PROMOTED = ROOT / "app" / "data" / "aqua_questions.json"


def as_number(text: str) -> Fraction | None:
    """Parse an option into an exact number, or None if it is not one."""
    cleaned = text.strip().replace(",", "")
    cleaned = re.sub(r"^(number is|the number is)\s*", "", cleaned, flags=re.I).strip()
    if not cleaned:
        return None
    try:
        return Fraction(cleaned)
    except (ValueError, ZeroDivisionError):
        return None


# Each checker takes the stem and the claimed answer, and returns True only when
# the maths actually holds.

def _times_gives(stem: str, answer: Fraction) -> bool | None:
    """"19 times a number gives 342." -> answer * 19 == 342"""
    m = re.search(r"(\d+)\s*times a number\s*(?:gives|equals|is)\s*(\d+)", stem, re.I)
    if not m:
        return None
    return answer * int(m.group(1)) == int(m.group(2))


def _half_plus(stem: str, answer: Fraction) -> bool | None:
    """"Half a number plus 7 is 17." -> answer/2 + 7 == 17"""
    m = re.search(r"half a number plus\s*(\d+)\s*is\s*(\d+)", stem, re.I)
    if not m:
        return None
    return answer / 2 + int(m.group(1)) == int(m.group(2))


def _fraction_decreased(stem: str, answer: Fraction) -> bool | None:
    """"If 1/5th of a number decreased by 5 is 5" -> answer/5 - 5 == 5"""
    m = re.search(
        r"(\d+)\s*/\s*(\d+)(?:th|st|nd|rd)?\s*of a number decreased by\s*(\d+)\s*is\s*(\d+)",
        stem,
        re.I,
    )
    if not m:
        return None
    num, den, minus, result = (int(g) for g in m.groups())
    return answer * Fraction(num, den) - minus == result


def _multiplied_increased(stem: str, answer: Fraction) -> bool | None:
    """"Find the number which multiplied by 15 is increased by 196."
    -> 15a == a + 196"""
    m = re.search(
        r"multiplied by\s*(\d+)\s*is increased by\s*(\d+)", stem, re.I
    )
    if not m:
        return None
    factor, delta = int(m.group(1)), int(m.group(2))
    return answer * factor == answer + delta


CHECKERS = (_times_gives, _half_plus, _fraction_decreased, _multiplied_increased)


def verify(item: dict) -> tuple[bool, str]:
    """(passed, why). An unrecognised template fails closed."""
    answer_text = item["options"][item["answer_index"]]
    answer = as_number(answer_text)
    if answer is None:
        return False, f"answer {answer_text!r} is not a number"

    for checker in CHECKERS:
        verdict = checker(item["stem"], answer)
        if verdict is None:
            continue
        if verdict:
            return True, checker.__name__
        return False, f"{checker.__name__}: {answer_text} does not satisfy the stem"

    return False, "no checker recognises this template"


def hint_for(stem: str) -> str:
    """One hand-written sentence naming the first move.

    A `guided` item differs from a `transfer` item by exactly this: a nudge
    toward the first step, not a different question. Written per template rather
    than generated, because a hint pointing the wrong way is worse than no hint.
    """
    lowered = stem.lower()
    if "times a number" in lowered:
        return "Divide both sides by the multiplier first."
    if "half a number" in lowered:
        return "Subtract the added amount first, then double."
    if "decreased by" in lowered:
        return "Undo the subtraction first."
    if "increased by" in lowered:
        return "Collect the unknown on one side first."
    return "Write the sentence as an equation first."


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--promote", action="store_true")
    args = parser.parse_args()

    shortlist = json.loads(SHORTLIST.read_text(encoding="utf-8"))
    passed: list[dict] = []
    failures: list[tuple[str, str]] = []

    for topic_id, items in shortlist.items():
        for item in items:
            ok, why = verify(item)
            if ok:
                item["topic_id"] = topic_id
                passed.append(item)
            else:
                failures.append((item["stem"][:70], why))

    total = sum(len(v) for v in shortlist.values())
    print(f"  {len(passed)} of {total} candidates verified")
    print("\n  rejected:")
    for stem, why in failures[:12]:
        # The Windows console is cp1252 and some stems carry maths symbols.
        # Losing a character in a diagnostic is fine; crashing on one is not.
        safe = stem.encode("ascii", "replace").decode("ascii")
        print(f"    {safe}")
        print(f"      -> {why}")

    if args.promote:
        # Deduplicate on a NORMALISED stem, not the raw one. The dataset carries
        # the same item three times differing only by a "when" and trailing
        # punctuation, and shipping all three would make rotation serve what
        # looks like the same question over and over.
        unique: dict[str, dict] = {}
        for item in passed:
            key = re.sub(r"[^a-z0-9]+", "", item["stem"].lower())
            unique.setdefault(key, item)

        out = sorted(unique.values(), key=lambda i: (len(i["stem"]), i["stem"]))

        # Kind is presentational rather than intrinsic: the same item could
        # serve as any of the three. Shortest become `timed`, because a
        # countdown needs a stem you can read at a glance. Longest become
        # `guided` and carry a hint. Everything between is `transfer`.
        third = max(1, len(out) // 3)
        for i, item in enumerate(out):
            if i < third:
                item["kind"] = "timed"
            elif i < 2 * third:
                item["kind"] = "transfer"
            else:
                item["kind"] = "guided"
                item["stem"] = f"{hint_for(item['stem'])} {item['stem']}"
            item["id"] = f"aqua_{item['topic_id']}_{i:02d}"

        PROMOTED.write_text(
            json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        counts: dict[str, int] = {}
        for item in out:
            counts[item["kind"]] = counts.get(item["kind"], 0) + 1
        print(f"\n  promoted {len(out)} to {PROMOTED}")
        print(f"  kinds: {counts}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
