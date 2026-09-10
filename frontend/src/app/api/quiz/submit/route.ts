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
    return fixtureResponse(quizSubmitFixture(body.selected_index, body.topic_id));
  }

  return proxy('POST', '/quiz/submit', { body });
}
