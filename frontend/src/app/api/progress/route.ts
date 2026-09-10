import { fixtureResponse, proxy, usingFixtures } from '@/lib/backend';
import { progressFixture } from '@/lib/fixtures';

/**
 * Refetch after a quiz. Not used on initial load — the progress_panel block
 * returned by /ask already carries this.
 *
 * There is no `/progress` endpoint in the PRD's contract (§3). The backend
 * currently only exposes `/roadmap`. This route exists so the progress panel can
 * be a live subscription rather than a frozen slice of the ask payload; when the
 * real contract is settled, either the backend gains the endpoint or this folds
 * into `/roadmap`. Flagged in FRONTEND_PLAN.md §19 as a contract question.
 */
export async function GET(request: Request): Promise<Response> {
  const userId = new URL(request.url).searchParams.get('user_id') ?? 'demo';

  if (usingFixtures) {
    return fixtureResponse(progressFixture(userId));
  }

  return proxy('GET', `/progress?user_id=${encodeURIComponent(userId)}`);
}
