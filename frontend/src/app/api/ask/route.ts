import { errorResponse, fixtureResponse, proxy, usingFixtures } from '@/lib/backend';
import { askFixture } from '@/lib/fixtures';
import { isProfile, type AskRequest } from '@/lib/types';

/**
 * The primary endpoint. A forwarding address, nothing more.
 *
 * Budget: 150 ms cached, 2500 ms uncached (FRONTEND_PLAN.md §4).
 */
export async function POST(request: Request): Promise<Response> {
  let body: AskRequest;
  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return errorResponse(400, 'Request body must be JSON.');
  }

  // Shape check only. This is not an authorization decision — the backend still
  // decides whether this user may ask anything at all.
  if (!isProfile(body?.profile) || typeof body?.question !== 'string') {
    return errorResponse(400, 'Provide a known profile and a question.');
  }

  if (usingFixtures) {
    return fixtureResponse(askFixture(body.profile, body.question));
  }

  return proxy('POST', '/ask', { body });
}
