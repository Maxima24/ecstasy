# Automated Contributor Instructions

These instructions apply to every path in the repository.

## Active exception: Hackathon mode

**A time-boxed exception is in force. Check it before you rely on it.**

`RULES.md` section 10 is the authority; this is a summary that can go stale.
Read the window there first. If the window has expired or `Active` is not
`yes`, ignore this section entirely and follow the default rules.

    Window: 2026-09-10 18:14 to 2026-09-20 23:59 (WAT, UTC+01:00)

### Relaxed while the window is open

- You MAY merge without a second approver. State your evidence anyway.
- You MAY land a contract and its implementation in the same pull request,
  provided `contracts/VERSION` is still updated.
- You MAY skip per-branch governance synchronization pull requests.
- You MAY treat a feature as ready while `docs/PROJECT_BRIEF.md` and the
  `docs/ARCHITECTURE.md` tables still contain placeholders.
- `.github/CODEOWNERS` is inactive; no owner review will be auto-requested.

### NOT relaxed. Do not assume otherwise.

- Never commit, paste, or log a secret. Use variable names and secret-manager
  references only.
- Never rebase, force-push, or delete `main`, `frontend`, `backend`, or
  `integration`. These are published branches.
- Stay inside your stack path. `backend/` work lives only on `backend`;
  `frontend/` work lives only on `frontend`.
- Never merge `integration` into a stack branch.
- Branch names still require `<type>/<scope>/<issue>-<slug>` with a real issue
  number. This is machine-checked.
- Report failing or skipped checks as failing or skipped.

`scripts/Test-Policy.Tests.ps1` enforces the path, naming, and secret rules for
the whole window. Run it before you open a pull request:

```bash
pwsh -NoProfile -File scripts/Test-Policy.Tests.ps1
pwsh -NoProfile -File scripts/Test-Foundation.ps1
```

### If you are the backend agent

Work only under `backend/` and target the `backend` branch. Your interface to
the frontend is the approved artifact under `contracts/`, never the frontend
source tree. If you need an interface that does not exist yet, add it to
`contracts/` in the same pull request (the window permits this) and say so
explicitly in the pull-request body so the frontend agent can consume it. Do
not invent an undocumented interface and leave the other stack to guess.

When the window closes, every default rule returns automatically.

## Before changing anything

1. Read `RULES.md`, the relevant issue/specification, and the applicable stack
   documentation.
2. Inspect the current branch and working tree. Preserve unrelated user changes.
3. Confirm the target scope and allowed path before editing.
4. For cross-stack behavior, confirm that an approved contract exists on
   `main`. Do not invent an interface to unblock implementation.

## Path and branch discipline

- On `main`, edit governance, specifications, contracts, GitHub configuration,
  or governance scripts only. Never add product implementation.
- Frontend work belongs under `frontend/` and targets `frontend`.
- Backend work belongs under `backend/` and targets `backend`.
- Integration-only work belongs under `integration/` and targets `integration`.
- Never merge `integration` into a stack branch or rewrite permanent history.
- Use `<type>/<scope>/<issue>-<slug>` for short-lived branches.

## Delivery behavior

- Make the smallest cohesive change that satisfies the accepted criteria.
- Keep public behavior aligned with `contracts/` and report contract drift.
- Run relevant validation and report exact commands and results.
- Never expose secrets or silently discard, reset, or overwrite existing work.
- Update documentation with behavior changes.
- End review-ready or unfinished work with the handoff fields from `HANDOFF.md`.

If instructions conflict, follow the precedence declared in `RULES.md` and
surface the conflict rather than choosing silently.

