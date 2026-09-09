# Branch, Integration, and Release Workflow

This workflow keeps permanent stack branches isolated while producing a
continuously tested whole product on `integration`.

## Branch route matrix

| Source | Target | Allowed content | Merge strategy |
| --- | --- | --- | --- |
| `docs/governance/<issue>-<slug>` or equivalent governance branch | `main` | Governance paths | Squash |
| Stack-scoped short-lived branch | Matching permanent stack | Matching stack directory | Squash |
| Integration-scoped short-lived branch | `integration` | `integration/` | Squash |
| `main` | `frontend`, `backend`, `integration` | Governance synchronization | Merge commit |
| `frontend` | `integration` | `frontend/` changes | Merge commit |
| `backend` | `integration` | `backend/` changes | Merge commit |

Any route not listed is forbidden. In particular, `integration` never targets a
stack branch and one stack never targets the other.

## Branch names

Use `<type>/<scope>/<issue>-<slug>`. Types are `feat`, `fix`, `hotfix`, `chore`,
`refactor`, `test`, and `docs`; scopes are `governance`, `frontend`, `backend`,
and `integration`.

Do not name a working branch `frontend/...` or `backend/...`. A Git ref named
`frontend` cannot safely coexist with a ref directory using the same name.

## Governance synchronization

After a change lands on `main`:

1. The governance owner opens `main` to `frontend`, `main` to `backend`, and
   `main` to `integration` synchronization PRs.
2. Each PR runs governance checks and uses a merge commit.
3. Feature PRs that depend on the change wait until their target permanent
   branch contains that `main` commit.
4. For contract changes, `main` reaches `integration` before either stack
   implementation is integrated.

This common ancestry prevents the same documentation change from reappearing
when stack branches later merge into `integration`.

## Cross-stack feature flow

1. Create a feature issue and classify its contract impact.
2. Approve the shared specification and contract on `main`.
3. Synchronize `main` into all permanent implementation branches.
4. Implement frontend and backend independently using mocks, fixtures, or
   contract tests derived from the approved artifact.
5. Squash each feature PR into its owning stack branch.
6. Open or refresh the stack-to-`integration` PR immediately.
7. The integrator merges each stack with a merge commit after required checks.
8. Run end-to-end acceptance checks on the assembled product.

One side may be integrated before the other only when the change is
backward-compatible and safely inactive or feature-flagged. Otherwise, hold
both integrations for a coordinated merge.

## Conflict handling

Never merge `integration` back into `frontend` or `backend` to resolve a
conflict. Instead:

1. create `chore/integration/<issue>-<slug>` from current `integration`;
2. merge the relevant permanent stack branch into that temporary branch;
3. resolve only the integration conflict and rerun checks;
4. open a PR from the temporary branch to `integration`; and
5. merge with a merge commit so the stack commit remains an ancestor.

If the conflict reveals a stack defect, stop and fix it through that stack's
normal branch before retrying integration.

## Hotfixes

- Use `hotfix/<scope>/<issue>-<slug>` from the branch that owns the defect.
- Apply normal review, test, and ownership requirements; urgency does not waive
  evidence.
- Merge the hotfix into the owning branch first, then continuously forward that
  permanent branch into `integration`.
- Use the emergency bypass only when delay causes greater documented harm. Open
  a follow-up review and corrective issue immediately afterward.

## Releases

The named integrator or backup performs releases.

1. Confirm `integration` contains the intended frontend, backend, governance,
   and integration commits.
2. Confirm all [release gates](QUALITY.md#release-gate) are green.
3. Choose the next semantic version for the product.
4. Create an annotated tag from the exact `integration` commit:

   ```bash
   git switch integration
   git pull --ff-only
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

5. Create GitHub release notes linked to issues, contract changes, migrations,
   known limitations, and rollback instructions.

Tags are immutable. Never move or reuse a released version. Roll back to a
known-good tag when supported; otherwise fix forward through the owning stack
and issue a new version.

