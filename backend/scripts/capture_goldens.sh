#!/usr/bin/env bash
# Capture golden responses from the fixture frontend.
#
# These are the specification for the Python port. The fixture's exact strings —
# em dashes in reasons, middle dots in evidence claims, tally phrasing, block
# ordering per profile — are what the backend must reproduce. Transcribing them
# by hand into Python literals is where parity bugs come from; capturing the
# bytes is where they die.
#
# Requires the fixture frontend running with BACKEND_URL unset.
#   usage: bash scripts/capture_goldens.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:3001}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/tests/golden"
mkdir -p "$OUT"

jqs() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{process.stdout.write(JSON.stringify(JSON.parse(d),null,2)+'\n')})"; }

ask()    { curl -s -X POST "$BASE/api/ask" -H 'content-type: application/json' \
             -d "{\"user_id\":\"$1\",\"profile\":\"$2\",\"question\":\"If 3x + 5 = 20, what is x?\"}"; }
answer() { curl -s -X POST "$BASE/api/quiz/submit" -H 'content-type: application/json' \
             -d "{\"user_id\":\"$1\",\"question_id\":\"linear_transfer_01\",\"topic_id\":\"linear_equations\",\"selected_index\":$2,\"elapsed_ms\":$3}"; }
roadmap()  { curl -s "$BASE/api/roadmap?user_id=$1"; }
progress() { curl -s "$BASE/api/progress?user_id=$1"; }

# scenario <name> <user> <profile>  — captures ask/roadmap/progress for current state
snapshot() {
  ask "$2" "$3"   | jqs > "$OUT/$1.ask.json"
  roadmap "$2"    | jqs > "$OUT/$1.roadmap.json"
  progress "$2"   | jqs > "$OUT/$1.progress.json"
  echo "  captured $1"
}

echo "capturing from $BASE"

# 1. Seed state, every profile. A fresh user_id per profile so no state leaks.
for p in rusty time_poor hands_free strong; do
  snapshot "seed_$p" "g_seed_$p" "$p"
done

# 2. One correct, fast.
answer g_one_correct 2 5000 | jqs > "$OUT/one_correct.submit.json"
snapshot one_correct g_one_correct rusty

# 3. One wrong.
answer g_one_wrong 0 12000 | jqs > "$OUT/one_wrong.submit.json"
snapshot one_wrong g_one_wrong rusty

# 4. Two wrong -> prerequisite_reset. Cites the PREREQUISITE, not the focus topic.
answer g_prereq 0 12000 > /dev/null
answer g_prereq 0 12000 | jqs > "$OUT/prerequisite_reset.submit.json"
snapshot prerequisite_reset g_prereq rusty

# 5. Two fast correct -> timed_drill.
answer g_timed 2 4000 > /dev/null
answer g_timed 2 4000 | jqs > "$OUT/timed_drill.submit.json"
snapshot timed_drill g_timed strong

# 6. One slow correct -> guided_practice, with the last explainer step faded.
answer g_guided 2 24000 | jqs > "$OUT/guided_practice.submit.json"
snapshot guided_practice g_guided rusty

# 7. Five answers — the RECENT_WINDOW boundary. The sixth must push the first out.
for i in 1 2 3 4 5; do answer g_window 2 5000 > /dev/null; done
answer g_window 0 12000 | jqs > "$OUT/window_boundary.submit.json"
snapshot window_boundary g_window rusty

echo "done -> $OUT"
