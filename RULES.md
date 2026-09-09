# Repository Rules

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative. These
rules apply to humans, automation, and coding agents.

## 1. Authority and precedence

When instructions conflict, use this order:

1. This file.
2. Approved contracts and feature specifications on `main`.
3. Accepted architecture decision records (ADRs).
4. Stack-local documentation.
5. Issue, pull-request, review, and handoff notes.

A lower source MUST NOT silently override a higher source. Open a governance or
contract change when the higher source is wrong or incomplete.

## 2. Sources of truth

- GitHub issues define active work, ownership, dependencies, and acceptance
  criteria.
- Pull requests contain review evidence, test results, and the current handoff.
- Static Markdown on `main`z defines durable policy and architecture.
- Files under `contracts/` define approved machine-readable interfaces.
- Secrets and credentials MUST NOT be committed or pasted into handoffs, logs,
  examples, screenshots, issues, or pull requests.

## 3. Permanent branch boundaries

- `main` MUST contain only governance documents, specifications, contracts,
  GitHub configuration, and governance validation scripts. Product code is
  forbidden.
- `frontend` MUST place stack-owned implementation, tests, assets, generated
  outputs, configuration, and local documentation under `frontend/`.
- `backend` MUST place stack-owned implementation, tests, migrations,
  configuration, and local documentation under `backend/`.
- `integration` MUST place integration-owned composition, deployment manifests,
  end-to-end tests, and integration tooling under `integration/`.
- `integration` MAY contain `frontend/` and `backend/` only through merges from
  their permanent branches.
- `integration` MUST NOT be merged back into `frontend` or `backend`.
- Permanent branches MUST NOT be rebased, force-pushed, or deleted.
- After bootstrap, changes to every permanent branch MUST arrive through a pull
  request unless the documented emergency bypass is used.

## 4. Working branches

Create short-lived branches with this format:

```text
<type>/<scope>/<issue>-<slug>
```

Allowed types are `feat`, `fix`, `hotfix`, `chore`, `refactor`, `test`, and
`docs`. Allowed scopes are `governance`, `frontend`, `backend`, and
`integration`.

Examples:

```text
feat/frontend/42-login-form
fix/backend/57-token-expiry
docs/governance/63-review-policy
chore/integration/71-compose-conflict
```

The issue number and lowercase kebab-case slug are mandatory. Do not create
`frontend/...` or `backend/...`: Git cannot reliably store a branch and a
branch namespace with the same ref name.

Each branch and pull request MUST deliver one logical outcome. Unrelated edits
MUST be separated.

## 5. Contract-first delivery

- Every issue MUST classify contract impact as `none`, `compatible`, or
  `breaking`.
- A change that affects both stacks MUST have its interface and acceptance
  criteria approved on `main` before either implementation is ready to merge.
- Contract changes MUST be reviewed by both frontend and backend owners.
- Implementations MUST conform to the approved artifact under `contracts/`;
  implementation behavior is not an undocumented substitute for a contract.
- Breaking changes require a major contract-version increase and a migration,
  compatibility, feature-flag, or coordinated rollout plan.

## 6. Reviews and merges

- Every pull request requires passing governance checks, resolved review
  conversations, one approval, and applicable code-owner approval.
- Authors MUST NOT approve their own pull request.
- Feature branches are squash-merged into their target stack or governance
  branch.
- Governance synchronization from `main` and merges from `frontend` or
  `backend` into `integration` MUST use merge commits to preserve ancestry.
- Stack changes MUST reach `integration` continuously after approval.
- Stack-specific defects discovered in integration MUST be fixed on the owning
  stack first and then forwarded to `integration`.
- Integration conflicts MUST be resolved on a temporary
  `chore/integration/...` branch created from `integration`, never by merging
  `integration` into a stack branch.

## 7. Quality and evidence

- Work MUST satisfy the definitions in [docs/QUALITY.md](docs/QUALITY.md).
- A pull request MUST state the exact commands run and their results.
- Failing or skipped checks MUST be explained and explicitly accepted by the
  relevant owner; release gates cannot be waived silently.
- Generated files, dependency changes, migrations, and configuration changes
  MUST be called out in the pull request and handoff.
- Documentation MUST change in the same workflow as the behavior it describes.

## 8. Releases

- Only the named integrator or backup integrator may merge into `integration`
  and create release tags.
- Releases MUST be immutable annotated semantic-version tags from a green
  `integration` commit.
- A tag MUST NOT be moved or reused. Corrections require a new version.
- An incomplete cross-stack feature may enter `integration` only when it is
  backward-compatible and disabled or safely feature-flagged.

## 9. Security and exceptions

- Use environment-variable names and secret-manager references, never secret
  values.
- New dependencies MUST have a stated purpose and must pass the stack's
  dependency and vulnerability checks once those checks exist.
- Sensitive data MUST be redacted from test fixtures and evidence.
- Emergency bypasses are limited to maintainers, require an incident or issue
  reference, and MUST receive a follow-up review and corrective issue.
- Changes to this file require a `governance`-scoped pull request and governance
  owner approval.

