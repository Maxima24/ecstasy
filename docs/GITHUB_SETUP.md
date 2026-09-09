# GitHub Repository Setup

This bootstrap creates local branches and configuration but does not create or
modify a remote repository.

## 1. Complete ownership and product identity

Before pushing:

1. replace all `@ORG/...` and `[assign]` placeholders in
   [OWNERSHIP.md](OWNERSHIP.md) and `.github/CODEOWNERS`;
2. complete [PROJECT_BRIEF.md](PROJECT_BRIEF.md);
3. choose the first contract format and update [CONTRACTS.md](CONTRACTS.md) if
   format-specific rules are necessary; and
4. review every rule with the initial maintainers.

## 2. Add and publish the remote

Create an empty GitHub repository without generated files, then run:

```bash
git remote add origin <git-url>
git push -u origin main frontend backend integration
```

Set `main` as the default branch.

## 3. Repository merge settings

- Enable squash merging for short-lived feature PRs.
- Enable merge commits for governance synchronization and stack integration.
- Disable rebase merging.
- Do not enable required linear history; this model intentionally preserves
  synchronization and integration merge commits.
- Automatically delete merged short-lived branches, but never permanent ones.

## 4. Labels

Create at least:

- `scope:governance`, `scope:frontend`, `scope:backend`, `scope:integration`;
- `type:feature`, `type:bug`, `type:contract`, `type:decision`;
- `contract:none`, `contract:compatible`, `contract:breaking`; and
- `status:blocked`, `status:ready`, `release:blocker`.

## 5. Run checks once

Open a test governance PR so GitHub registers these check names:

- `Repository policy`
- `Foundation validation`

Do not require a status check until it has completed at least once in the
repository.

## 6. Protect permanent branches

Create a branch ruleset targeting `main`, `frontend`, `backend`, and
`integration` with:

- pull requests required;
- one approving review;
- stale approvals dismissed when new commits are pushed;
- code-owner review required;
- all conversations resolved;
- `Repository policy` and `Foundation validation` required;
- force pushes blocked;
- branch deletion blocked; and
- merge commits allowed.

Grant emergency bypass only to the smallest maintainer group. Repository rules
still require every bypass to reference an incident/issue and receive a
follow-up review.

## 7. Validate ownership behavior

Open one harmless PR for each owned path and confirm the expected teams are
automatically requested. A placeholder or inaccessible team makes ownership
protection ineffective and MUST be corrected before product work begins.

## 8. First implementation setup

After the brief and first contract are approved:

- create `frontend/` through a frontend-scoped PR;
- create `backend/` through a backend-scoped PR;
- create `integration/` through an integration-scoped PR; and
- define stack-specific CI commands without weakening the governance checks.

