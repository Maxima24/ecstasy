import 'server-only';

import { ADAPTATION_THRESHOLDS } from '../adaptation';
import type { ObservedAnswer, SessionEvidence, TopicEvidence } from '../adaptation';
import type { ProgressPanel, Roadmap, RoadmapStep } from '../types';

/**
 * Demo session state — a fixture standing in for Postgres.
 *
 * The real backend keeps answer history in a database and returns `roadmap` and
 * `progress_panel` blocks already filled. Until that exists, this holds the same
 * state in memory so the learner loop is real: answering a question changes what
 * the adaptation policy sees, and therefore changes what comes next.
 *
 * THIS IS A FIXTURE, NOT DOMAIN LOGIC (FRONTEND_PLAN.md R1). It lives under
 * `src/lib/fixtures/` and is reached only from the `usingFixtures` branch of a
 * route handler. The moment `BACKEND_URL` is set, none of it runs.
 *
 * State is per-process and resets when the server restarts, which is deliberate:
 * each demo take starts from the same seed with no manual reset step. A
 * serverless deployment, where each invocation may get a cold module, would
 * silently lose progress — record locally or deploy to a single long-lived
 * instance.
 */

type TopicId = string;

type TopicSeed = {
  topic_id: TopicId;
  label: string;
  prerequisite_topic_id: TopicId | null;
  /** Ranking weight only. Never shown to the learner — see `evidenceClaim`. */
  seedMastery: number;
};

/**
 * Two topics, with a real prerequisite edge between them.
 *
 * `arithmetic` is what `linear_equations` depends on, which is what makes the
 * policy's `prerequisite_reset` branch reachable: miss linear equations twice
 * and it steps back rather than repeating the same question harder.
 */
const TOPIC_SEEDS: TopicSeed[] = [
  {
    topic_id: 'linear_equations',
    label: 'Linear equations',
    prerequisite_topic_id: 'arithmetic',
    seedMastery: 0.31,
  },
  {
    topic_id: 'arithmetic',
    label: 'Arithmetic',
    prerequisite_topic_id: null,
    /*
     * 0.38, not 0.62.
     *
     * This number decides whether the demo's centrepiece fires. PRD §18 step 6
     * requires that answering ONE question reorders the roadmap and moves the
     * next topic to the top. With CORRECT_DELTA at +0.11, a single correct
     * answer lifts linear_equations from 0.31 to 0.42 — which crosses 0.38 and
     * reorders, but would not have crossed 0.62.
     *
     * At 0.62 it took three correct answers, so the FLIP animation did nothing
     * on the answer a judge actually gives. Keep the gap under the delta.
     */
    seedMastery: 0.38,
  },
];

const SEEDS = new Map(TOPIC_SEEDS.map((t) => [t.topic_id, t]));

/** The topic the seeded demo question is about. */
export const FOCUS_TOPIC_ID = 'linear_equations';

/** Ranking movement only. Deliberately not presented as a measurement. */
const CORRECT_DELTA = 0.11;
const WRONG_DELTA = -0.05;
const DONE_THRESHOLD = 0.7;

/** How many answers per topic the policy is allowed to reason about. */
const RECENT_WINDOW = 5;

type SessionState = {
  mastery: Record<TopicId, number>;
  answers: Record<TopicId, ObservedAnswer[]>;
  streak: number;
  sequence: number;
};

const sessions = new Map<string, SessionState>();

function seed(): SessionState {
  const mastery: Record<TopicId, number> = {};
  const answers: Record<TopicId, ObservedAnswer[]> = {};
  for (const topic of TOPIC_SEEDS) {
    mastery[topic.topic_id] = topic.seedMastery;
    answers[topic.topic_id] = [];
  }
  // A judge lands in a populated account: partial progress, a streak already
  // going. No empty state (PRD Definition of Done, step 1).
  return { mastery, answers, streak: 4, sequence: 0 };
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
 * contract's "exactly one step has status `next`" — it is the first element by
 * construction, rather than a flag that could drift out of sync. Ties break on
 * topic id so a row never jitters between two equal positions.
 */
function ranked(session: SessionState): TopicId[] {
  return TOPIC_SEEDS.map((t) => t.topic_id).sort((a, b) => {
    const delta = session.mastery[a] - session.mastery[b];
    return delta !== 0 ? delta : a.localeCompare(b);
  });
}

/**
 * What the learner is told about a topic.
 *
 * Deliberately not a percentage. A number like "31%" implies a measurement this
 * prototype has not earned, and pseudo-precision reads as less intelligent, not
 * more. Every claim here is something the session can actually evidence: how
 * many of the recent answers were right, and how quickly.
 */
function evidenceClaim(session: SessionState, topicId: TopicId): string {
  const recent = session.answers[topicId] ?? [];

  if (recent.length === 0) {
    return session.mastery[topicId] >= DONE_THRESHOLD
      ? 'Steady so far'
      : 'Not practised yet';
  }

  const correct = recent.filter((a) => a.correct).length;
  const tally = `${correct} of last ${recent.length} correct`;

  const slow = recent.filter(
    (a) => a.elapsed_ms >= ADAPTATION_THRESHOLDS.slowResponseMinMs,
  ).length;
  const fast = recent.filter(
    (a) => a.elapsed_ms <= ADAPTATION_THRESHOLDS.fastResponseMaxMs,
  ).length;

  if (correct === recent.length && fast === recent.length) {
    return `${tally} · ready for a timed question`;
  }
  if (correct === recent.length && slow > 0) {
    return `${tally} · slow but accurate`;
  }
  if (correct === 0) {
    return `${tally} · needs another ${labelFor(topicId).toLowerCase()} problem`;
  }
  return tally;
}

function labelFor(topicId: TopicId): string {
  return SEEDS.get(topicId)?.label ?? topicId;
}

function statusFor(index: number, mastery: number): RoadmapStep['status'] {
  if (index === 0) return 'next';
  return mastery >= DONE_THRESHOLD ? 'done' : 'later';
}

export function roadmapFor(userId: string): Roadmap {
  const session = getSession(userId);

  return {
    type: 'roadmap',
    steps: ranked(session).map((topic_id, i) => ({
      topic_id,
      label: labelFor(topic_id),
      mastery: session.mastery[topic_id],
      evidence_claim: evidenceClaim(session, topic_id),
      status: statusFor(i, session.mastery[topic_id]),
    })),
  };
}

export function progressFor(userId: string): ProgressPanel {
  const session = getSession(userId);
  const order = ranked(session);
  const weakest = order[0];

  return {
    type: 'progress_panel',
    weakest_topics: order.map((topic_id) => ({
      topic_id,
      label: labelFor(topic_id),
      mastery: session.mastery[topic_id],
      evidence_claim: evidenceClaim(session, topic_id),
    })),
    streak: session.streak,
    next_action_label: `Practise ${labelFor(weakest).toLowerCase()} next`,
  };
}

/**
 * Everything the adaptation policy is allowed to see.
 *
 * Assembled here rather than inside the policy so the policy stays a pure
 * function of evidence — which is what makes it reviewable on `/dev` without
 * playing through the app.
 */
export function evidenceFor(userId: string): SessionEvidence {
  const session = getSession(userId);

  const topics: Record<TopicId, TopicEvidence> = {};
  for (const seedTopic of TOPIC_SEEDS) {
    topics[seedTopic.topic_id] = {
      topic_id: seedTopic.topic_id,
      label: seedTopic.label,
      prerequisite_topic_id: seedTopic.prerequisite_topic_id,
      recent: session.answers[seedTopic.topic_id] ?? [],
    };
  }

  return {
    user_id: userId,
    revision: session.sequence,
    focus_topic_id: FOCUS_TOPIC_ID,
    topics,
    roadmap: roadmapFor(userId),
    progress: progressFor(userId),
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
function roadmapSignature(userId: string): string {
  return roadmapFor(userId)
    .steps.map((s) => `${s.topic_id}:${s.status}:${s.evidence_claim}`)
    .join('|');
}

/**
 * Apply an answer to the session.
 *
 * `roadmapChanged` compares the whole visible roadmap — ordering, status and
 * evidence claims — not just the ordering. The client uses this flag to decide
 * whether to invalidate, so it must mean "the roadmap changed", not "the order
 * changed". An answer that moves no rows still changes a claim; reporting
 * `false` there would leave the screen showing something stale.
 *
 * The reorder animation stays honest regardless: the FLIP measures a per-row
 * delta and skips anything under a pixel.
 */
export function recordAnswer(
  userId: string,
  topicId: TopicId,
  correct: boolean,
  elapsedMs: number,
): RecordedAnswer {
  const session = getSession(userId);
  const signatureBefore = roadmapSignature(userId);

  const before = session.mastery[topicId] ?? 0;
  const after = clamp(before + (correct ? CORRECT_DELTA : WRONG_DELTA));

  session.mastery[topicId] = after;
  session.sequence += 1;

  const history = session.answers[topicId] ?? [];
  history.push({ correct, elapsed_ms: elapsedMs, sequence: session.sequence });
  // Bounded so the policy reasons about recent behaviour, not the whole session.
  session.answers[topicId] = history.slice(-RECENT_WINDOW);

  session.streak = correct ? session.streak + 1 : 0;

  return {
    before,
    after,
    roadmapChanged: signatureBefore !== roadmapSignature(userId),
    streak: session.streak,
  };
}

/**
 * Run a scripted answer sequence against a throwaway session.
 *
 * Used by `/dev` to show what the policy decides for several evidence states
 * side by side, without playing through the app.
 */
export function simulate(
  answers: Array<{ topicId: TopicId; correct: boolean; elapsedMs: number }>,
): SessionEvidence {
  const scratch = `__preview__${Math.random()}`;
  sessions.delete(scratch);
  for (const answer of answers) {
    recordAnswer(scratch, answer.topicId, answer.correct, answer.elapsedMs);
  }
  const evidence = evidenceFor(scratch);
  sessions.delete(scratch);
  return evidence;
}
