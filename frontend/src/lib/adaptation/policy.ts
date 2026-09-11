import 'server-only';

import type {
  AdaptationSummary,
  Block,
  InstructionalState,
  Profile,
  Quiz,
} from '../types';
import { ADAPTATION_THRESHOLDS } from './constants';
import { audioFor, explainerFor, flashcardsFor, questionFor } from './materials';
import type { ObservedAnswer, SessionEvidence, TopicEvidence } from './types';

/**
 * Behavioural adaptation fixture standing in for backend intelligence.
 *
 * This module is server-only and is called exclusively by `askFixture`, which
 * itself is reached only from a route handler's `usingFixtures` branch. It is
 * not frontend domain logic and must be replaced by a backend-owned policy when
 * that service exists (FRONTEND_PLAN.md R1/R10).
 */

export type AdaptationPlan = AdaptationSummary & { blocks: Block[] };

function last(topic: TopicEvidence): ObservedAnswer | undefined {
  return topic.recent.at(-1);
}

function trailing(topic: TopicEvidence, count: number): ObservedAnswer[] {
  return topic.recent.slice(-count);
}

function isFastCorrect(answer: ObservedAnswer): boolean {
  return answer.correct && answer.elapsed_ms <= ADAPTATION_THRESHOLDS.fastResponseMaxMs;
}

function repeatedMiss(topic: TopicEvidence): boolean {
  const recent = trailing(topic, ADAPTATION_THRESHOLDS.repeatedMisses);
  return (
    recent.length === ADAPTATION_THRESHOLDS.repeatedMisses &&
    recent.every((answer) => !answer.correct)
  );
}

function fastCorrectStreak(topic: TopicEvidence): boolean {
  const recent = trailing(topic, ADAPTATION_THRESHOLDS.fastCorrectStreak);
  return (
    recent.length === ADAPTATION_THRESHOLDS.fastCorrectStreak &&
    recent.every(isFastCorrect)
  );
}

function decisionFor(evidence: SessionEvidence): {
  state: InstructionalState;
  topic: TopicEvidence;
  reason: string;
} {
  const focus = evidence.topics[evidence.focus_topic_id];

  // A malformed fixture should still yield a complete, reviewable screen.
  if (!focus) {
    const fallback = Object.values(evidence.topics)[0];
    if (!fallback) {
      throw new Error('The adaptation fixture needs at least one topic.');
    }
    return {
      state: 'focused_practice',
      topic: fallback,
      reason: `Starting with a ${fallback.label.toLowerCase()} check.`,
    };
  }

  if (repeatedMiss(focus) && focus.prerequisite_topic_id) {
    const prerequisite = evidence.topics[focus.prerequisite_topic_id];
    if (prerequisite) {
      return {
        state: 'prerequisite_reset',
        topic: prerequisite,
        reason:
          `Back to ${prerequisite.label.toLowerCase()} first — ` +
          `that is what ${focus.label.toLowerCase()} depends on.`,
      };
    }
  }

  if (fastCorrectStreak(focus)) {
    return {
      state: 'timed_drill',
      topic: focus,
      reason: `Timed drill — two fast correct ${focus.label.toLowerCase()} answers.`,
    };
  }

  const latest = last(focus);
  if (latest && !latest.correct) {
    return {
      state: 'worked_transfer',
      topic: focus,
      reason: `More guidance — your last ${focus.label.toLowerCase()} answer was wrong.`,
    };
  }

  if (
    latest?.correct &&
    latest.elapsed_ms >= ADAPTATION_THRESHOLDS.slowResponseMinMs
  ) {
    return {
      state: 'guided_practice',
      topic: focus,
      reason:
        `More guidance — your last ${focus.label.toLowerCase()} answer ` +
        'was correct but slow.',
    };
  }

  return {
    state: 'focused_practice',
    topic: focus,
    reason: latest?.correct
      ? `Near-transfer question — your last ${focus.label.toLowerCase()} answer was correct.`
      : `Starting with a ${focus.label.toLowerCase()} check.`,
  };
}

function quizFor(
  topicId: string,
  state: InstructionalState,
  profile: Profile,
): Quiz {
  const kind =
    state === 'timed_drill'
      ? 'timed'
      : state === 'focused_practice'
        ? 'transfer'
        : 'guided';

  return {
    type: 'quiz',
    // The approved profile invariant reserves visible timers for `strong`.
    // Other profiles still receive the compressed question selected by the
    // timed-drill state, but without a countdown.
    timer_seconds:
      profile === 'strong'
        ? state === 'timed_drill'
          ? ADAPTATION_THRESHOLDS.compressedTimerSeconds
          : ADAPTATION_THRESHOLDS.standardTimerSeconds
        : null,
    questions: [questionFor(topicId, kind)],
  };
}

function instructionalCore(
  topicId: string,
  state: InstructionalState,
  profile: Profile,
): Block[] {
  const quiz = quizFor(topicId, state, profile);

  if (
    state === 'worked_transfer' ||
    state === 'guided_practice' ||
    state === 'prerequisite_reset'
  ) {
    // Faded only for `guided_practice` — the learner answered correctly but
    // slowly, so they can already do this and completing the example beats
    // reading it. A learner who got it wrong, or is back on a prerequisite,
    // still gets the whole thing.
    return [explainerFor(topicId, state === 'guided_practice'), quiz];
  }

  return [quiz];
}

/**
 * Choose and compose the next screen from observed behaviour plus a delivery
 * preference. No profile is a pre-authored screen: it changes ordering,
 * modality and density around the instructional state selected above.
 */
export function policy(evidence: SessionEvidence, profile: Profile): AdaptationPlan {
  const decision = decisionFor(evidence);
  let core = instructionalCore(decision.topic.topic_id, decision.state, profile);

  // `rusty` must still open with a segmented worked example even after strong
  // evidence. The invariant will clamp this raw set to that first block.
  if (profile === 'rusty' && core[0]?.type !== 'explainer_card') {
    core = [explainerFor(decision.topic.topic_id), ...core];
  }

  let blocks: Block[];
  switch (profile) {
    case 'rusty':
      blocks = [...core, evidence.roadmap, evidence.progress];
      break;
    case 'time_poor':
      blocks = [evidence.roadmap, ...core, evidence.progress];
      break;
    case 'hands_free':
      blocks = [audioFor(decision.topic.topic_id), ...core, flashcardsFor(decision.topic.topic_id)];
      break;
    case 'strong':
      blocks = [...core, evidence.roadmap, evidence.progress];
      break;
  }

  return {
    state: decision.state,
    topic_id: decision.topic.topic_id,
    reason: decision.reason,
    blocks: blocks.slice(0, 5),
  };
}

