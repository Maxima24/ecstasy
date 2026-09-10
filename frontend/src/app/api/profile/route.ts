import { errorResponse, proxy, usingFixtures } from '@/lib/backend';
import { isProfile, type ProfileRequest } from '@/lib/types';

/**
 * Persists the profile choice. Returns 204.
 *
 * Fire and forget: the frontend flips optimistically and does not await this.
 * A failure here must never block or reverse the flip.
 */
export async function POST(request: Request): Promise<Response> {
  let body: ProfileRequest;
  try {
    body = (await request.json()) as ProfileRequest;
  } catch {
    return errorResponse(400, 'Request body must be JSON.');
  }

  if (!isProfile(body?.profile)) {
    return errorResponse(400, 'Provide a known profile.');
  }

  if (usingFixtures) {
    return new Response(null, { status: 204, headers: { 'x-data-source': 'fixture' } });
  }

  return proxy('POST', '/profile', { body });
}
