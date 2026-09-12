import 'server-only';

/**
 * Server-side environment access.
 *
 * Importing this module from a client component is a build error, which is the
 * point: nothing here may reach the browser. Anything the browser legitimately
 * needs goes in a `NEXT_PUBLIC_*` variable and is public by definition — never
 * put a secret there.
 *
 * See ADR-0001 and FRONTEND_PLAN.md §6.
 */

function positiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Expected a positive number, received ${JSON.stringify(raw)}. Check your environment.`,
    );
  }
  return Math.floor(parsed);
}

/**
 * A duration where zero is meaningful.
 *
 * `FIXTURE_DELAY_MS=0` means "no artificial delay", which is exactly what you
 * want when recording or when a real backend is answering. Rejecting it threw
 * during module load, and because this module is imported by every route
 * handler that turned a harmless setting into a 500 on every API route with no
 * hint as to why.
 */
function nonNegativeInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `Expected zero or a positive number, received ${JSON.stringify(raw)}. Check your environment.`,
    );
  }
  return Math.floor(parsed);
}

const backendUrl = process.env.BACKEND_URL?.trim() || null;

export const serverEnv = {
  /**
   * Base URL of the backend API.
   *
   * `null` means no backend is configured and the proxy serves fixtures. That
   * is the expected state until Day 8.
   */
  backendUrl,

  /**
   * Static bearer token (PRD §3.1).
   *
   * Demo-grade, but it stays server-side: the browser never sees it. This is
   * the reason the proxy exists at all rather than the browser calling the
   * backend directly.
   */
  apiToken: process.env.API_TOKEN?.trim() || null,

  /** Abandon a backend call after this many milliseconds. */
  backendTimeoutMs: positiveInt(process.env.BACKEND_TIMEOUT_MS, 5_000),

  /**
   * Artificial delay on fixture responses.
   *
   * 600 ms by default, per PRD §4.3 — every loading and skeleton state is built
   * against this. Skeletons only ever seen against a warm cache will be wrong
   * on the day the cache misses.
   */
  fixtureDelayMs: nonNegativeInt(process.env.FIXTURE_DELAY_MS, 600),
} as const;

/** True while no backend is configured and the proxy is serving fixtures. */
export const usingFixtures = serverEnv.backendUrl === null;
