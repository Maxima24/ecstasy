import 'server-only';

/**
 * Server-side environment access.
 *
 * Importing this module from a client component is a build error, which is the
 * point: nothing here may reach the browser. Anything the browser legitimately
 * needs goes in a `NEXT_PUBLIC_*` variable and is public by definition — never
 * put a secret there.
 *
 * See ADR-0001.
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

const backendUrl = process.env.BACKEND_URL?.trim() || null;

export const serverEnv = {
  /**
   * Base URL of the backend API.
   *
   * `null` means no backend is configured yet, and the proxy serves fixtures
   * instead. That is the expected state until the backend stack is chosen.
   */
  backendUrl,

  /** Abandon a backend call after this many milliseconds. */
  backendTimeoutMs: positiveInt(process.env.BACKEND_TIMEOUT_MS, 5_000),
} as const;

/** True while no backend is configured and the proxy is serving fixtures. */
export const usingFixtures = serverEnv.backendUrl === null;
