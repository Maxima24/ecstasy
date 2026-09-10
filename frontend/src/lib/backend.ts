import 'server-only';

import { cookies } from 'next/headers';

import { serverEnv, usingFixtures } from './env';
import { fixtureFor } from './fixtures';

/**
 * The only module in this application that talks to the backend.
 *
 * ADR-0001: server code here is a backend-for-frontend proxy, never an
 * implementation. This module may forward credentials, aggregate calls, and
 * reshape payloads. It must not decide authorization — the backend does that,
 * and a 401 or 403 from the backend is passed through unchanged.
 *
 * If you find yourself adding a rule here that decides *whether* something is
 * allowed, it belongs in the backend and in `contracts/`.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ProxyInit = {
  /** JSON-serialisable request body. */
  body?: unknown;
  /** Extra headers to forward. `Cookie` and `Content-Type` are handled here. */
  headers?: Record<string, string>;
  /** Next.js cache behaviour. Defaults to no caching, correct for authed calls. */
  cache?: RequestCache;
};

/** Shape returned to the browser when a backend call cannot be completed. */
type ProxyError = {
  error: string;
  /** Correlates the browser-visible failure with a server log line. */
  reference: string;
};

function errorResponse(
  status: number,
  message: string,
  reference: string = crypto.randomUUID(),
): Response {
  const payload: ProxyError = { error: message, reference };
  // The detail stays in the server log; the browser gets a reference only.
  return Response.json(payload, { status, headers: { 'x-proxy-reference': reference } });
}

/**
 * Forward a request to the backend and return its response.
 *
 * While `BACKEND_URL` is unset the matching fixture is served instead, so the
 * frontend runs with no backend at all. Responses carry `x-data-source` so it
 * is always obvious which mode produced them.
 */
export async function proxy(
  method: HttpMethod,
  path: string,
  init: ProxyInit = {},
): Promise<Response> {
  const baseUrl = serverEnv.backendUrl;

  if (usingFixtures || baseUrl === null) {
    const fixture = fixtureFor(method, path);
    if (!fixture) {
      return errorResponse(
        501,
        `No fixture for ${method} ${path}. Add one in src/lib/fixtures, or set BACKEND_URL.`,
      );
    }
    return Response.json(fixture.body, {
      status: fixture.status,
      headers: { 'x-data-source': 'fixture' },
    });
  }

  const url = new URL(path, baseUrl).toString();

  // Session custody is a frontend concern; session *validation* is the
  // backend's. We forward what the browser sent and let the backend decide.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const headers: Record<string, string> = {
    accept: 'application/json',
    ...init.headers,
  };
  if (cookieHeader) headers.cookie = cookieHeader;
  if (init.body !== undefined) headers['content-type'] = 'application/json';

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: init.cache ?? 'no-store',
      signal: AbortSignal.timeout(serverEnv.backendTimeoutMs),
    });

    // Pass the backend's status through untouched, including 401 and 403.
    // Reinterpreting them here would move an authorization decision into the
    // frontend, which ADR-0001 forbids.
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return Response.json(payload, {
      status: response.status,
      headers: { 'x-data-source': 'backend' },
    });
  } catch (cause) {
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
    const reference = crypto.randomUUID();

    // Log the cause server-side; never return it to the browser, since backend
    // hostnames and stack traces are not the browser's business.
    console.error(`[proxy ${reference}] ${method} ${path} failed`, cause);

    return errorResponse(
      timedOut ? 504 : 502,
      timedOut ? 'The backend did not respond in time.' : 'The backend could not be reached.',
      reference,
    );
  }
}
