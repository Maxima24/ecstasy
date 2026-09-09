# Contract-First Collaboration

Contracts let frontend and backend develop independently without using either
implementation as undocumented truth.

## Contract location and version

Approved machine-readable artifacts live under `contracts/`. Suitable formats
include OpenAPI, GraphQL schema, AsyncAPI, protobuf, JSON Schema, and equivalent
technology-appropriate definitions.

`contracts/VERSION` is the aggregate contract version:

- PATCH: clarification or correction that changes no observable behavior;
- MINOR: backward-compatible capability;
- MAJOR: breaking behavior requiring coordinated migration.

The foundation begins at `0.0.0`. The first approved contract increments it.
Format-specific version metadata MUST agree with the aggregate version when the
format supports such metadata.

## Impact classifications

| Impact | Meaning | Required action |
| --- | --- | --- |
| `none` | No shared interface or observable cross-stack behavior changes | State why in the PR |
| `compatible` | Existing consumers continue to work unchanged | Approve contract first and increment MINOR |
| `breaking` | An existing consumer, payload, workflow, or guarantee may fail | Increment MAJOR and approve migration/rollout plan |

A behavioral clarification that exposes previous implementation drift is not
automatically `none`; classify it by consumer impact.

## Change workflow

1. Open a contract-change issue describing consumer need and compatibility.
2. Add or update the feature specification and machine-readable artifact on a
   `governance`-scoped branch from `main`.
3. Include examples, error behavior, validation constraints, security effects,
   and acceptance scenarios.
4. Obtain frontend-owner and backend-owner approval. Governance owns process;
   both consumers own interface usability.
5. Merge to `main`, synchronize all permanent branches, and only then merge
   dependent stack implementations.
6. Verify both implementations against the same artifact in `integration`.

The backend implementation does not redefine the contract, and frontend
assumptions do not extend it. Discovered gaps return to `main` as a reviewed
contract change.

## Breaking changes

A breaking proposal MUST define:

- affected consumers and old behavior;
- new behavior and version boundary;
- data or client migration;
- coexistence, versioning, or feature-flag strategy;
- deployment and rollback order; and
- removal criteria for deprecated behavior.

Both implementations may enter `integration` only in a sequence that leaves
the assembled product runnable after each merge.

## Contract test expectations

- Frontend uses approved examples, generated clients, mocks, or fixtures.
- Backend validates requests, responses, events, and error shapes against the
  approved artifact.
- Integration detects schema drift and runs cross-stack acceptance scenarios.
- Generated contract outputs identify their source and are regenerated, not
  manually patched.

