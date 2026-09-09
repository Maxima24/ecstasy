# Contributing

All changes start from an owned GitHub issue with acceptance criteria and a
declared contract impact. Read [RULES.md](RULES.md) before contributing.

## 1. Make the work ready

Before implementation, confirm that the issue has:

- one accountable owner and the affected scope;
- observable acceptance criteria;
- dependencies and rollout constraints;
- contract impact: `none`, `compatible`, or `breaking`; and
- an approved contract/specification on `main` when more than one stack is
  affected.

Use the [feature specification template](docs/templates/FEATURE_SPEC.md) for
work too large to specify clearly in an issue.

## 2. Create the correct branch

Update the permanent branch that owns the change, then create a short-lived
branch. For example:

```bash
git switch frontend
git pull --ff-only
git switch -c feat/frontend/42-login-form
```

Use `main` as the starting point for governance work, `backend` for backend
work, and `integration` only for integration-owned work. Branch names follow
`<type>/<scope>/<issue>-<slug>`.

## 3. Implement within the boundary

- Keep frontend changes under `frontend/`, backend changes under `backend/`,
  and integration-only changes under `integration/`.
- Do not edit a contract from an implementation branch. Submit and approve the
  contract change on `main`, then synchronize governance first.
- Prefer commits written as `type(scope): concise outcome`, for example
  `feat(frontend): add login form validation`.
- Run the stack's format, lint, type, test, build, security, and contract checks
  when those commands exist.

## 4. Open and review the pull request

Target the owning permanent branch. Complete every relevant section of the PR
template, attach acceptance evidence, and provide a current handoff. One
approval, applicable owner review, passing required checks, and resolved
conversations are mandatory.

Feature pull requests are squash-merged. The resulting title SHOULD follow the
commit format above.

## 5. Synchronize and integrate

After a governance change is merged, open synchronization PRs from `main` into
`frontend`, `backend`, and `integration`. Merge these with merge commits.

After an approved stack change, open a PR from the permanent stack branch into
`integration`. The named integrator merges it with a merge commit after
integration checks pass. Do not wait for a release window.

If a merge conflict exists, branch from `integration` using
`chore/integration/<issue>-<slug>`, merge the stack branch into that temporary
branch, resolve the conflict there, and target `integration`. Never merge
`integration` back into the stack.

## 6. Hand off responsibly

Use [HANDOFF.md](HANDOFF.md) whenever work changes hands or pauses. GitHub issues
and pull requests are the source of truth for live status.

For release and repository-administration steps, see
[docs/WORKFLOW.md](docs/WORKFLOW.md) and
[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md).

