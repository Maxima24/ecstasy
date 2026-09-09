# Automated Contributor Instructions

These instructions apply to every path in the repository.

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

