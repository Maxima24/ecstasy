import type {
  AskResponse,
  ProgressPanel,
  Profile,
  QuizSubmitResponse,
  Roadmap,
} from './types';

/**
 * Client-side callers.
 *
 * These call this app's own proxy routes, never the backend directly — the
 * browser does not know the backend URL and does not hold the bearer token.
 *
 * Whether a response came from a fixture or a real backend is decided
 * server-side by `BACKEND_URL`. There is no mock flag here: one fixture
 * mechanism, one request path, in development and production alike.
 */

export const DEMO_USER_ID = 'demo';

export class ApiError extends Error {
  readonly status: number;
  readonly reference: string | null;

  constructor(status: number, message: string, reference: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reference = reference;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const reference = response.headers.get('x-proxy-reference');
    let message = 'Something went wrong.';
    try {
      const body = (await response.json()) as { error?: string | { message?: string } };
      if (typeof body.error === 'string') message = body.error;
      else if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body. Keep the generic message.
    }
    // Carries `status` so the query retry policy can skip 4xx.
    throw new ApiError(response.status, message, reference);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function ask(question: string, profile: Profile): Promise<AskResponse> {
  return request<AskResponse>('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ user_id: DEMO_USER_ID, profile, question }),
  });
}

export function submitAnswer(args: {
  questionId: string;
  topicId: string;
  selectedIndex: number;
  elapsedMs: number;
}): Promise<QuizSubmitResponse> {
  return request<QuizSubmitResponse>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({
      user_id: DEMO_USER_ID,
      question_id: args.questionId,
      topic_id: args.topicId,
      selected_index: args.selectedIndex,
      elapsed_ms: args.elapsedMs,
    }),
  });
}

export function fetchRoadmap(): Promise<Roadmap> {
  return request<Roadmap>(`/api/roadmap?user_id=${DEMO_USER_ID}`);
}

export function fetchProgress(): Promise<ProgressPanel> {
  return request<ProgressPanel>(`/api/progress?user_id=${DEMO_USER_ID}`);
}

/**
 * Persist the profile choice.
 *
 * Fire and forget (PRD §3.6). The flip has already happened; a failure here
 * must never reverse it, so the rejection is swallowed deliberately.
 */
export function persistProfile(profile: Profile): void {
  void request<void>('/api/profile', {
    method: 'POST',
    body: JSON.stringify({ user_id: DEMO_USER_ID, profile }),
  }).catch(() => {
    // Intentionally ignored. The choice is local truth; the server copy is
    // a convenience.
  });
}
