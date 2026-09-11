import { errorResponse, fixtureResponse, proxy, usingFixtures } from '@/lib/backend';
import { quizSubmitFixture } from '@/lib/fixtures';
import type { QuizSubmitRequest } from '@/lib/types';

/**
 * Records an answer and returns updated mastery.
 *
 * No model call in this path — budget is 300 ms. The learner has already seen
 * their result, because `answer_index` shipped with the block and grading
 * happened locally. This call only records it.
 */
export async function POST(request: Request): Promise<Response> {
  let body: QuizSubmitRequest;
  try {
    body = (await request.json()) as QuizSubmitRequest;
  } catch {
    return errorResponse(400, 'Request body must be JSON.');
  }

  if (typeof body?.selected_index !== 'number' || typeof body?.topic_id !== 'string') {
    return errorResponse(400, 'Provide selected_index and topic_id.');
  }

  if (usingFixtures) {
    // The fixture mutates session mastery, so this is the one fixture call with
    // a side effect. It stays a fixture: the handler decides nothing, it only
    // forwards the recorded result.
    return fixtureResponse(
      quizSubmitFixture(
        body.selected_index,
        body.topic_id,
        body.user_id,
        // Elapsed time is not telemetry here — the policy reads it to tell a
        // confident answer from a laboured one, which is what separates a
        // timed drill from guided practice. Dropping it silently made
        // `guided_practice` unreachable.
        typeof body.elapsed_ms === 'number' ? body.elapsed_ms : 0,
      ),
    );
  }

  return proxy('POST', '/quiz/submit', { body });
}
