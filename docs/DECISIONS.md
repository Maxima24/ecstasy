# Architecture Decision Index

Architecture decision records (ADRs) preserve why consequential choices were
made. They complement current documentation; they do not replace contracts or
repository rules.

## When an ADR is required

Create an ADR for a change to:

- a system, data, or trust boundary;
- a major technology or dependency family;
- persistence, messaging, authentication, or deployment architecture;
- a public contract strategy;
- a cross-stack convention with meaningful long-term cost; or
- a decision that reverses or supersedes an earlier ADR.

Use [the ADR template](templates/ADR.md). Store records as
`docs/decisions/NNNN-kebab-case-title.md`, assigning the next unused four-digit
number. Accepted ADRs are immutable except for typo or link corrections; a new
ADR supersedes an old decision.

## Status lifecycle

`Proposed` becomes `Accepted`, `Rejected`, or `Deprecated`. An accepted decision
may later become `Superseded by ADR-NNNN`. The relevant owners listed in
[OWNERSHIP.md](OWNERSHIP.md) decide acceptance.

## Index

| ADR | Status | Date | Decision |
| --- | --- | --- | --- |
| [ADR-0001](decisions/0001-frontend-stack-nextjs.md) | Accepted | 2026-09-10 | Next.js for the frontend; server code limited to a BFF proxy |

