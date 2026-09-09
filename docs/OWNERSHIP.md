# Ownership

Replace every placeholder below before enabling CODEOWNERS-based protection.
Use GitHub users or teams that already have repository access.

## Current assignments

| Responsibility | GitHub owner | Backup | Accountable for |
| --- | --- | --- | --- |
| Governance | `@ORG/governance` | `[assign]` | Rules, process, project brief, ADR index |
| Frontend | `@ORG/frontend` | `[assign]` | `frontend/`, client contract usability |
| Backend | `@ORG/backend` | `[assign]` | `backend/`, service contract implementation |
| Integration | `@ORG/integration` | `[assign]` | `integration/`, cross-stack validation |
| Current integrator | `[assign person]` | `[assign person]` | Stack merges, release readiness, tags |
| Security reviewer | `@ORG/security` | `[assign]` | Threat, dependency, and sensitive-data review |

The current integrator and backup MUST be named people before the first
integration merge. Rotation is allowed, but update this table and
`.github/CODEOWNERS` through a governance PR before transferring release
authority.

## Decision rights

| Change | Required owners |
| --- | --- |
| Repository rule or workflow | Governance |
| Contract, compatible or breaking | Frontend and backend |
| Frontend implementation | Frontend |
| Backend implementation | Backend |
| Integration tooling or end-to-end behavior | Integration plus affected stack owner |
| Release tag | Current integrator or backup |
| Security-sensitive behavior | Owning stack plus security reviewer |

Ownership approval does not replace normal review or required checks. An owner
may request another specialist whenever risk exceeds their expertise.

## Escalation

- Product ambiguity returns to the issue/specification owner.
- Contract disagreement is resolved jointly by frontend and backend owners; if
  no safe interface is accepted, work remains blocked and governance records
  the decision.
- Architecture-boundary disagreement requires an ADR.
- A security concern blocks release until the security reviewer records a safe
  disposition.
- Integrator unavailability transfers only to the documented backup.

