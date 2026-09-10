import { fixtureResponse, proxy, usingFixtures } from '@/lib/backend';
import { roadmapFixture } from '@/lib/fixtures';

/**
 * Refetch after a quiz. Not used on initial load — the roadmap block returned
 * by /ask already carries this.
 */
export async function GET(request: Request): Promise<Response> {
  const userId = new URL(request.url).searchParams.get('user_id') ?? 'demo';

  if (usingFixtures) {
    return fixtureResponse(roadmapFixture());
  }

  return proxy('GET', `/roadmap?user_id=${encodeURIComponent(userId)}`);
}
