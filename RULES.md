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
- Static Markdown on `main` defines durable policy and architecture.
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


## 10. Hackathon mode (time-boxed exception)

This repository's default rules assume a long-lived product built by separate
teams. During a hackathon that cadence blocks delivery: a cross-stack change
would need a contract PR on `main`, three synchronization merges, and a second
approver before any feature code could land.

Hackathon mode is a **declared, time-boxed** exception. It relaxes review
ceremony. It never relaxes safety.

### Activation

Hackathon mode is active only while this section records an unexpired window.
Governance MUST fill in both dates in the same pull request that activates it.

- **Active:** **yes**
- **Window:** 2026-09-10 18:14 to 2026-09-26 23:59 (WAT, UTC+01:00)
- **Event:** Prometheus Fall Classic — Ectasy build (submission 2026-09-26)
- **Declared by:** @Maxima24 (Steel Maxima), governance owner
- **Tracking issue:** #1

An undated or expired window means hackathon mode is **off**, and every default
rule applies without further action.

### Suspended for the window

- **Second approver** (section 6). A contributor MAY merge their own pull
  request. Self-merged pull requests MUST still state their evidence.
- **Governance synchronization PRs** (`docs/WORKFLOW.md`). Changes on `main`
  MAY be fast-forwarded or batch-merged into the permanent branches without a
  pull request per branch.
- **Contract-before-implementation ordering** (section 5). A contract and its
  implementations MAY land in the same pull request, provided
  `contracts/VERSION` is still updated and both stack owners are notified.
- **Completed project brief and architecture tables** (`docs/QUALITY.md`
  definition of ready). Placeholder values do not block a feature from being
  ready.
- **CODEOWNERS enforcement.** `.github/CODEOWNERS` MAY remain inactive.
- **Merge-strategy formality** (section 6). Any strategy MAY be used, provided
  permanent branch history is not rewritten.

### Never suspended

- Secrets MUST NOT be committed, pasted, or logged (section 2, section 9).
- Permanent branches MUST NOT be rebased, force-pushed, or deleted (section 3).
- Stack path boundaries MUST hold (section 3). `frontend/` stays on `frontend`,
  `backend/` on `backend`.
- `integration` MUST NOT be merged back into a stack branch (section 6).
- Evidence MUST be honest. A failing or skipped check is reported as failing or
  skipped (section 7).
- Release tags MUST remain immutable (section 8).

`scripts/Test-Policy.Tests.ps1` enforces the never-suspended path and secret
rules and keeps running during the window.

### Exit

When the window closes, governance MUST, in one pull request:

1. set **Active** back to `no` and clear the window;
2. open a corrective issue for anything merged without a second approval that
   still needs review;
3. reconcile `contracts/VERSION` with the interfaces actually shipped;
4. complete `docs/PROJECT_BRIEF.md` and the `docs/ARCHITECTURE.md` tables if the
   work continues past the event; and
5. activate `.github/CODEOWNERS` before the next non-hackathon merge.

Work merged under this exception keeps its relaxed history. It is not
retroactively invalid, but it is not evidence that the default rules were met.
