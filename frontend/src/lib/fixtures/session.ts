import 'server-only';

import type { ProgressPanel, Roadmap, RoadmapStep } from '../types';

/**
 * Demo session state — a fixture standing in for Postgres.
 *
 * The real backend keeps mastery in a database and returns `roadmap` and
 * `progress_panel` blocks already filled. Until that exists, this holds the
 * same state in memory so the learner loop is real: answering a question moves
 * mastery, and the roadmap reorders because the ordering genuinely changed.
 *
 * THIS IS A FIXTURE, NOT DOMAIN LOGIC (FRONTEND_PLAN.md R1). It lives under
 * `src/lib/fixtures/`, and every route handler that uses it does so only in the
 * `usingFixtures` branch. The moment `BACKEND_URL` is set, none of this runs.
 * Do not import it from anywhere outside a fixture branch.
 *
 * State is per-process and resets when the server restarts, which is deliberate:
 * each demo take starts from the same seed with no manual reset step. It also
 * means a serverless deployment, where each invocation may get a cold module,
 * would silently lose progress — record locally or deploy to a single
 * long-lived instance.
 */

type TopicId = string;

type SessionState = {
  mastery: Record<TopicId, number>;
  streak: number;
  answered: number;
};

const TOPICS: Array<{ topic_id: TopicId; label: string; seed: number }> = [
  { topic_id: 'rates', label: 'Rates and speed', seed: 0.31 },
  { topic_id: 'work_time', label: 'Work and time', seed: 0.38 },
  { topic_id: 'percentages', label: 'Percentages', seed: 0.44 },
  { topic_id: 'ratios', label: 'Ratios', seed: 0.72 },
];

const LABELS = new Map(TOPICS.map((t) => [t.topic_id, t.label]));

/** A correct answer is worth more than a wrong one costs. */
const CORRECT_DELTA = 0.11;
const WRONG_DELTA = -0.05;

/** At or above this, a topic reads as mastered. */
const DONE_THRESHOLD = 0.7;

const sessions = new Map<string, SessionState>();

function seed(): SessionState {
  const mastery: Record<TopicId, number> = {};
  for (const topic of TOPICS) {
    mastery[topic.topic_id] = topic.seed;
  }
  // A judge lands in a populated account: partial mastery, a streak already
  // going. No empty state (PRD Definition of Done, step 1).
  return { mastery, streak: 4, answered: 0 };
}

export function getSession(userId: string): SessionState {
  let session = sessions.get(userId);
  if (!session) {
    session = seed();
    sessions.set(userId, session);
  }
  return session;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Topic ids weakest first.
 *
 * Ordering is derived on every read, never stored. That is what guarantees the
 * contract's "exactly one step has status `next`" — it is the first element,
 * by construction, rather than a flag that could drift out of sync.
 *
 * Ties break on topic id so the order is stable between reads and a row never
 * jitters between two equal positions.
 */
function rankedTopics(session: SessionState): TopicId[] {
  return [...TOPICS]
    .map((t) => t.topic_id)
    .sort((a, b) => {
      const delta = session.mastery[a] - session.mastery[b];
      return delta !== 0 ? delta : a.localeCompare(b);
    });
}

function statusFor(index: number, mastery: number): RoadmapStep['status'] {
  if (index === 0) return 'next';
  return mastery >= DONE_THRESHOLD ? 'done' : 'later';
}

export function roadmapFor(userId: string): Roadmap {
  const session = getSession(userId);

  return {
    type: 'roadmap',
    steps: rankedTopics(session).map((topic_id, i) => ({
      topic_id,
      label: LABELS.get(topic_id) ?? topic_id,
      mastery: session.mastery[topic_id],
      status: statusFor(i, session.mastery[topic_id]),
    })),
  };
}

export function progressFor(userId: string): ProgressPanel {
  const session = getSession(userId);
  const ranked = rankedTopics(session);
  const weakest = ranked[0];

  return {
    type: 'progress_panel',
    // Exactly three, per the contract.
    weakest_topics: ranked.slice(0, 3).map((topic_id) => ({
      topic_id,
      label: LABELS.get(topic_id) ?? topic_id,
      mastery: session.mastery[topic_id],
    })),
    streak: session.streak,
    next_action_label: `Fix ${(LABELS.get(weakest) ?? weakest).toLowerCase()} next`,
  };
}

export type RecordedAnswer = {
  before: number;
  after: number;
  /** True when anything the learner can see on the roadmap changed. */
  roadmapChanged: boolean;
  streak: number;
};

/** Everything a learner can see on the roadmap, as a comparable string. */
function roadmapSignature(session: SessionState): string {
  return rankedTopics(session)
    .map((id) => `${id}:${session.mastery[id].toFixed(3)}`)
    .join('|');
}

/**
 * Apply an answer to the session.
 *
 * `roadmapChanged` compares the whole visible roadmap — ordering *and* mastery
 * values — not just the ordering. The client uses this flag to decide whether
 * to invalidate, so it must mean "the roadmap changed", not "the order
 * changed". A wrong answer on the already-weakest topic moves no rows but does
 * move a percentage and a bar; reporting `false` there would leave the screen
 * showing a stale number.
 *
 * The reorder animation stays honest regardless: FLIP measures a per-row delta
 * and skips anything under a pixel, so a value-only change updates the numbers
 * without rows travelling.
 */
export function recordAnswer(
  userId: string,
  topicId: TopicId,
  correct: boolean,
): RecordedAnswer {
  const session = getSession(userId);
  const signatureBefore = roadmapSignature(session);

  const before = session.mastery[topicId] ?? 0;
  const after = clamp(before + (correct ? CORRECT_DELTA : WRONG_DELTA));

  session.mastery[topicId] = after;
  session.streak = correct ? session.streak + 1 : 0;
  session.answered += 1;

  return {
    before,
    after,
    roadmapChanged: signatureBefore !== roadmapSignature(session),
    streak: session.streak,
  };
}

/** Used by the dev route to show a reorder without playing through the app. */
export function previewAfterWrongAnswer(topicId: TopicId): Roadmap {
  const preview = '__preview__';
  sessions.delete(preview);
  recordAnswer(preview, topicId, false);
  const roadmap = roadmapFor(preview);
  sessions.delete(preview);
  return roadmap;
}
