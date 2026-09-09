# Quality Policy

Quality evidence is proportional to risk but never implicit. Every PR states
what was run, what passed, what was skipped, and why.

## Definition of ready

Work is ready to implement when it has:

- a linked issue, scope, accountable owner, and observable outcome;
- acceptance criteria covering success and relevant failure behavior;
- dependencies, constraints, and rollout needs;
- contract impact classified as `none`, `compatible`, or `breaking`;
- an approved contract/specification for cross-stack behavior; and
- identified security, privacy, migration, and accessibility implications.

## Stack definition of done

A frontend or backend change is done when:

- accepted behavior is implemented only in the owning stack path;
- approved contracts are satisfied with no undocumented behavior;
- formatting, linting, static/type checks, unit tests, and stack build pass when
  the stack defines them;
- relevant component, integration, migration, accessibility, security, and
  contract tests pass;
- new dependencies and generated outputs are disclosed;
- documentation and environment-variable names are current;
- no credential or sensitive data is present; and
- the PR contains reproducible evidence and a complete handoff.

## Integration definition of done

Integrated work is done when:

- required governance and both stack commits are present;
- the complete product builds and starts through the documented integration
  procedure;
- contract drift checks and end-to-end acceptance scenarios pass;
- backward compatibility or feature-flag behavior is verified where needed;
- migrations and rollback steps have been exercised at the appropriate level;
- observability exposes actionable failures without sensitive data; and
- known limitations and next ownership are recorded.

## Test layers

| Layer | Primary owner | Purpose |
| --- | --- | --- |
| Formatting, lint, static/type checks | Each stack | Fast correctness and consistency |
| Unit/component | Each stack | Local behavior and edge cases |
| Contract | Frontend and backend | Independent conformance to the approved interface |
| Stack integration | Each stack | Dependencies such as storage, browser, or service adapters |
| End-to-end | Integrator with both stack owners | Real cross-stack user outcomes |
| Security and dependency | Owning stack | Known vulnerabilities and unsafe behavior |
| Migration and rollback | Backend/integrator as applicable | Safe state transitions |

Flaky tests are defects. Do not normalize rerunning until green; link a defect,
identify ownership, and prevent unreliable evidence from authorizing a release.

## Pull-request evidence

Record exact commands and pass/fail/not-run results. Attach the smallest useful
evidence: screenshots for visual behavior, response examples for interfaces,
migration output for state changes, and logs for integration failures. Redact
sensitive values.

## Release gate

A release tag requires:

- all required GitHub checks green on the selected `integration` commit;
- approved frontend, backend, and contract changes included;
- end-to-end acceptance evidence;
- reviewed migration and rollback instructions when applicable;
- no unresolved release-blocking security finding;
- documented known limitations; and
- approval from the named integrator or backup.

