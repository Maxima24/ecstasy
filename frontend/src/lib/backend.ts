import 'server-only';

import { serverEnv, usingFixtures } from './env';

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
  /** Extra headers. `Authorization` and `Content-Type` are handled here. */
  headers?: Record<string, string>;
};

type ProxyError = {
  error: string;
  /** Correlates the browser-visible failure with a server log line. */
  reference: string;
};

export function errorResponse(
  status: number,
  message: string,
  reference: string = crypto.randomUUID(),
): Response {
  const payload: ProxyError = { error: message, reference };
  // The detail stays in the server log; the browser gets a reference only.
  return Response.json(payload, { status, headers: { 'x-proxy-reference': reference } });
}

/** Serve a fixture, with the configured delay so loading states are real. */
export async function fixtureResponse(body: unknown, status = 200): Promise<Response> {
  if (serverEnv.fixtureDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, serverEnv.fixtureDelayMs));
  }
  return Response.json(body, {
    status,
    headers: { 'x-data-source': 'fixture', 'cache-control': 'no-store' },
  });
}

/**
 * Forward a request to the backend and return its response.
 *
 * Callers check `usingFixtures` first and serve a fixture themselves — this
 * function assumes a backend is configured.
 */
export async function proxy(
  method: HttpMethod,
  path: string,
  init: ProxyInit = {},
): Promise<Response> {
  const baseUrl = serverEnv.backendUrl;

  if (baseUrl === null) {
    return errorResponse(
      501,
      'No backend is configured and no fixture handled this route. Set BACKEND_URL.',
    );
  }

  const url = new URL(path, baseUrl).toString();

  const headers: Record<string, string> = {
    accept: 'application/json',
    ...init.headers,
  };

  // Demo-grade static bearer (PRD §3.1), held server-side. The browser never
  // sees it — that is the whole reason this proxy exists.
  if (serverEnv.apiToken) {
    headers.authorization = `Bearer ${serverEnv.apiToken}`;
  }

  if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // R2: the proxy caches nothing. roadmap and progress_panel arrive filled
      // per user, so a cached response served to a second user is a cross-user
      // data leak, not a stale-data bug.
      cache: 'no-store',
      signal: AbortSignal.timeout(serverEnv.backendTimeoutMs),
    });

    // 204 carries no body. Response.json(undefined) would produce "undefined".
    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: { 'x-data-source': 'backend' },
      });
    }

    // Pass the backend's status through untouched, including 401 and 403.
    // Reinterpreting them here would move an authorization decision into the
    // frontend, which ADR-0001 forbids.
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return Response.json(payload, {
      status: response.status,
      headers: { 'x-data-source': 'backend', 'cache-control': 'no-store' },
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

export { usingFixtures };
