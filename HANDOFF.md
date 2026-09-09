# Handoff Protocol

A handoff makes unfinished or review-ready work executable by the next person
without private context. The active handoff belongs in the related GitHub issue
or pull-request body, not in a shared status file.

## When a handoff is required

Create or refresh the handoff when:

- requesting review;
- pausing work that another contributor may continue;
- transferring ownership;
- merging stack work that the integrator must consume;
- reporting a blocker; or
- ending a working session with incomplete work.

The handoff MUST describe the repository as it exists now. Replace stale
commands, commits, results, and next steps instead of appending an ambiguous
history.

## Required template

Copy this section into the issue or pull request:

```markdown
## Handoff

### Identity
- Work item: #<issue or URL>
- Scope: governance | frontend | backend | integration
- Source branch: <branch>
- Commit: <full or short SHA>
- Current owner: @<owner>

### State
- Completed:
  - <verified result>
- Remaining:
  - <specific unfinished result>
- Blocked by: <issue, person, decision, or "Nothing">

### Contract
- Impact: none | compatible | breaking
- Version: <contracts/VERSION or "Not applicable">
- Contract/spec links: <paths or URLs>

### Setup and migration
- Setup commands: <exact commands or "None">
- Environment variable names: <names only or "None">
- Migrations or generated files: <details or "None">

### Tests and evidence
- Command: `<exact command>`
  - Result: pass | fail | not run
- Acceptance evidence: <screenshots, logs, response samples, or "Not yet">

### Risks
- Known issues: <details or "None">
- Security, compatibility, or rollout risks: <details or "None">

### Next action
- Action: <one concrete next action>
- Owner: @<person or team>
- Completion condition: <observable outcome>
```

## Acceptance checklist

A receiver SHOULD reject a handoff that:

- does not identify a branch and commit;
- says only “finish” or “test” without an observable outcome;
- omits failed, skipped, or unrun tests;
- references an unapproved contract;
- includes a credential or sensitive value; or
- has no named next owner.

Review approval is not acceptance of undisclosed work. If new facts are found
during review or integration, update the handoff before transferring ownership.

