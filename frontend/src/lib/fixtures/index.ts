import 'server-only';

/**
 * Stand-in backend responses used while no backend exists.
 *
 * These are a development scaffold, not a specification. When a contract is
 * approved under `contracts/`, these fixtures must be regenerated from it or
 * replaced — a fixture is never the source of truth for an interface
 * (docs/CONTRACTS.md).
 *
 * Keyed by `"<METHOD> <path>"`.
 */

export type Fixture = {
  status: number;
  body: unknown;
};

const fixtures: Record<string, Fixture> = {
  'GET /health': {
    status: 200,
    body: { status: 'ok' },
  },
};

export function fixtureFor(method: string, path: string): Fixture | undefined {
  return fixtures[`${method.toUpperCase()} ${path}`];
}
