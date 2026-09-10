# ADR-0001: Next.js for the frontend stack

- **Status:** Accepted
- **Date:** 2026-09-10
- **Deciders:** @Maxima24
- **Related issue:** #3
- **Supersedes:** None
- **Superseded by:** None

## Context

The repository separates `frontend/` and `backend/` into independently owned
permanent branches that communicate only through an approved artifact under
`contracts/`. `RULES.md` section 3 forbids the frontend from owning private
server behavior, and `docs/ARCHITECTURE.md` places domain and authorization
enforcement in the backend, stating that client-side checks are not a security
boundary.

Next.js is a full-stack framework. Route Handlers, Server Actions, and server
components all execute on a server the frontend team owns. Adopting it without
a stated boundary would make it trivial — especially under hackathon time
pressure — for domain logic and data access to accumulate in `frontend/`,
producing two sources of truth for behavior the contract is supposed to define.

The backend stack is not yet chosen, so this decision must not assume a
language, a runtime, or a transport.

## Decision

Use **Next.js with the App Router and TypeScript** as the frontend stack, under
one binding constraint:

> **Server code in `frontend/` is a backend-for-frontend proxy, never an
> implementation.**

Route Handlers and Server Actions MAY:

- proxy and aggregate calls to the backend;
- hold session material the browser must not read, such as httpOnly cookies and
  refresh tokens, and attach credentials to backend calls;
- adapt backend payload shapes for presentation; and
- serve frontend-only concerns such as health checks and preview routes.

Route Handlers and Server Actions MUST NOT:

- implement domain rules, business validation, or authorization decisions;
- open a database, cache, queue, or object-store connection; or
- expose behavior that is not derived from the approved contract.

The backend remains the authorization boundary. A proxy in `frontend/` forwards
credentials; it never decides whether a caller is permitted to act. Every
resource the proxy exposes traces to an approved artifact under `contracts/`.

Session custody is treated as a frontend concern because it exists to serve the
browser. Session *validation* remains a backend concern.

## Alternatives considered

| Alternative | Why it was not chosen |
| --- | --- |
| Strict client boundary: no server code in `frontend/` at all | Purest fit with the rules, but it forces access and refresh tokens into browser-readable storage, or a cookie domain shared with the backend. The security cost outweighed the simplicity gain. |
| Next.js owns some domain logic directly | Fastest initially, but it splits domain truth across two stacks, makes the contract advisory rather than authoritative, and leaves authorization enforced in a place the rules say is not a security boundary. |
| A single-page app on a static host (Vite/React) | Removes the boundary question entirely, but gives up server rendering, route-level data loading, and httpOnly session handling. |
| A fullstack Next.js application with no separate backend | Contradicts the repository's premise of two independently owned stacks and a shared contract. Would require rewriting `RULES.md`, not an ADR. |

## Consequences

### Positive

- Server rendering and route-level data loading without exposing tokens to
  browser-readable storage.
- The contract stays authoritative: the proxy can only surface what the
  contract defines.
- The backend choice stays open. The frontend depends on a transport-agnostic
  contract, not on a specific backend language or runtime.
- The boundary is stated in advance, so a violation is a reviewable defect
  rather than a matter of opinion.

### Negative or costly

- Every backend call gains a proxy hop, costing latency and a small amount of
  boilerplate per resource.
- The boundary is a convention that code review must uphold. Nothing in Next.js
  itself prevents a developer from importing a database driver into a Route
  Handler.
- "Aggregation" and "adaptation" shade into business logic at the margin.
  Ambiguous cases are resolved by a follow-up ADR, not by precedent set in a
  pull request.
- Under hackathon mode (`RULES.md` section 10) a single contributor may merge
  their own work, which removes the second reviewer who would normally catch
  boundary erosion.

## Compatibility and security

- **Contract impact:** `none`. This decision selects a stack; it defines no
  shared interface. `contracts/VERSION` is unchanged at `0.0.0`.
- **Authorization:** unchanged and unaffected. The backend remains the sole
  enforcement point. The proxy forwards credentials and never decides access.
- **Secrets:** backend base URLs, API keys, and session signing keys are
  referenced by environment-variable **name** only. Any value reachable from
  `NEXT_PUBLIC_*` is public by definition and MUST NOT hold a secret.
- **Data:** no database credential belongs in `frontend/`. The absence of a
  data-store dependency in the frontend manifest is the practical test.

## Rollout and validation

1. Scaffold `frontend/` under issue #3 on the `frontend` branch.
2. Record the chosen package manager and Node version in `frontend/README.md`.
3. Until a contract exists, develop against local fixtures or mocks. Do not
   read the backend source tree, and do not infer an interface from it.
4. When the first contract is approved on `main`, replace fixtures with a
   generated or hand-written client that names `contracts/` as its source.
5. Review test: for each file under `frontend/` that runs on the server, the
   reviewer confirms it performs no domain decision and opens no data
   connection.

Reverting is cheap while `frontend/` is still a scaffold and expensive once
Route Handlers exist. Revisit before the boundary carries real traffic.

## References

- `RULES.md` sections 3 and 5
- `docs/ARCHITECTURE.md`, architecture invariants
- `docs/CONTRACTS.md`
- Issue #3 — scaffold the frontend workspace
