<!--
Complete every relevant section (CONTRIBUTING.md section 4).
Delete sections that genuinely do not apply, and say why in Evidence.
-->

## Outcome

<!-- One logical outcome. Unrelated edits belong in a separate PR. -->

Closes #

## Scope and route

- **Scope:** governance | frontend | backend | integration
- **Source branch:** `<type>/<scope>/<issue>-<slug>`
- **Target branch:** `main` | `frontend` | `backend` | `integration`
- **Merge strategy:** squash (feature) | merge commit (governance sync, stack integration)

> Routes not listed in [docs/WORKFLOW.md](../docs/WORKFLOW.md) are forbidden.
> `integration` never targets a stack branch, and one stack never targets the other.

## Contract impact

- **Impact:** `none` | `compatible` | `breaking`
- **`contracts/VERSION`:** <!-- current -> proposed, or "unchanged" -->
- **Artifact/spec:** <!-- paths or URLs, or "Not applicable" -->

<!-- `none` requires a reason. A clarification that exposes prior drift is not
     automatically `none` — classify by consumer impact (docs/CONTRACTS.md). -->

**Why this classification:**

<!-- Breaking changes must state affected consumers, migration, coexistence
     strategy, deployment/rollback order, and removal criteria. -->

## Evidence

<!-- Exact commands and honest results. Skipped and failing checks must be
     listed and explained, not omitted (RULES.md section 7). -->

| Command | Result |
| --- | --- |
| `pwsh -NoProfile -File scripts/Test-Policy.Tests.ps1` | pass / fail / not run |
| `pwsh -NoProfile -File scripts/Test-Foundation.ps1` | pass / fail / not run |
| | |

**Acceptance evidence:** <!-- screenshots, response samples, logs, or "Not yet" -->

## Disclosures

- [ ] New or changed dependencies (purpose stated)
- [ ] Generated files (regenerated, not hand-patched)
- [ ] Migrations or state changes (rollback described)
- [ ] Configuration or environment-variable **names** (never values)
- [ ] Documentation updated in this PR
- [ ] No credential or sensitive value is present anywhere in this change

## Handoff

<!-- Required when requesting review. Full field list in HANDOFF.md. -->

- **Completed:** <!-- verified results -->
- **Remaining:** <!-- specific unfinished results, or "Nothing" -->
- **Blocked by:** <!-- issue, person, decision, or "Nothing" -->
- **Risks:** <!-- security, compatibility, rollout, or "None" -->
- **Next action / owner:** <!-- one concrete action and @owner -->

## Checklist

- [ ] One logical outcome
- [ ] Changes stay inside the branch's allowed path
- [ ] Contract impact classified, and approved on `main` first if cross-stack
- [ ] Required checks pass, or failures are explained and accepted above
- [ ] I am not the sole approver of my own PR <!-- waived in Hackathon Mode; see RULES.md section 10 -->
