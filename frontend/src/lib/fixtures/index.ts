import 'server-only';

import type {
  AskResponse,
  Block,
  ProgressPanel,
  Profile,
  QuizSubmitResponse,
  Roadmap,
} from '../types';
import { policy } from '../adaptation';
import { evidenceFor, progressFor, recordAnswer, roadmapFor } from './session';

/** The seeded demo account. PRD §3.1: no auth flow, no login screen. */
export const DEMO_USER = 'demo';

/**
 * Stand-in backend responses for building against with no backend running.
 *
 * These are a development scaffold, **not a specification**. When a contract is
 * approved under `contracts/`, regenerate or replace these from it — a fixture
 * is never the source of truth for an interface (FRONTEND_PLAN.md R10).
 *
 * Deliberate deviation from PRD §4.3: the PRD puts the mock flag in
 * `lib/api.ts`, which assumed a Vite SPA with no server of its own. Fixtures
 * live here instead, behind the proxy, so development and production exercise
 * the identical request path. One fixture mechanism, not two.
 *
 * Questions are AQuA-RAT shaped; citations point at OpenStax sections.
 */

/**
 * Static blocks below feed the BROKEN failure fixtures only. The live screen is
 * composed by the adaptation policy from session evidence — see `askFixture`.
 */
const ROADMAP_STEPS: Roadmap['steps'] = [
  { topic_id: 'linear_equations', label: 'Linear equations', mastery: 0.31, evidence_claim: '0 of last 2 correct', status: 'next' },
  { topic_id: 'arithmetic', label: 'Arithmetic', mastery: 0.72, evidence_claim: '3 of last 3 correct', status: 'done' },
];

const EXPLAINER: Block = {
  type: 'explainer_card',
  title: 'Isolating the variable',
  steps: [
    { text: 'Subtract 5 from both sides.', expr: '3x = 15' },
    // Escaped: in TypeScript '\f' is a form feed, so TeX needs a doubled
    // backslash in source. Single-backslash TeX silently becomes a control
    // character and KaTeX reports an unexpected-character parse error.
    { text: 'Divide both sides by 3.', expr: '\\frac{3x}{3} = \\frac{15}{3}' },
    { text: 'So x is 5.', expr: 'x = 5' },
  ],
  citation: { chunk_id: 'os_alg_2_3', label: 'Linear Equations, 2.3' },
};

const ROADMAP: Block = { type: 'roadmap', steps: ROADMAP_STEPS };

const PROGRESS: Block = {
  type: 'progress_panel',
  weakest_topics: [
    { topic_id: 'linear_equations', label: 'Linear equations', mastery: 0.31, evidence_claim: '0 of last 2 correct' },
    { topic_id: 'arithmetic', label: 'Arithmetic', mastery: 0.72, evidence_claim: '3 of last 3 correct' },
  ],
  streak: 4,
  next_action_label: 'Practise linear equations next',
};

const AUDIO: Block = {
  type: 'audio_explainer',
  script:
    'To isolate x, subtract 5 from both sides, leaving 3x equals 15. ' +
    'Then divide both sides by 3, giving x equals 5.',
  // A real, playable file so the audio control itself is visible. The failure
  // path is exercised deliberately by BROKEN.deadAudio rather than by leaving
  // the default profile unable to render its defining element.
  audio_url: '/fixture-silence.wav',
  duration_ms: 2_000,
  transcript_shown: false,
};

const QUIZ: Block = {
  type: 'quiz',
  timer_seconds: 90,
  questions: [
    {
      id: 'aqua_48213',
      stem: 'A train travels 120 km in 2 hours. What is its average speed?',
      stem_expr: null,
      options: ['45 km/h', '50 km/h', '60 km/h', '70 km/h', '80 km/h'],
      topic_id: 'rates',
      answer_index: 2,
      rationale:
        'Speed is distance over time. 120 km divided by 2 hours is 60 km/h.',
    },
  ],
};

const FLASHCARDS: Block = {
  type: 'flashcards',
  cards: [
    { front: 'What is average speed?', back: 'Total distance over total time.', topic_id: 'rates' },
    { front: 'a : b = 3 : 4, a = 9. Find b.', back: '12', topic_id: 'ratios' },
  ],
};

/**
 * The next screen, chosen by the adaptation policy.
 *
 * This no longer reads a hardcoded per-profile screen. The policy decides the
 * instructional state from observed behaviour, composes blocks for it, and
 * returns the reason for the choice alongside them. The profile shapes ordering,
 * modality and density around that decision — it is a delivery preference, not
 * a pre-authored screen.
 */
export function askFixture(
  profile: Profile,
  question: string,
  userId: string = DEMO_USER,
): AskResponse {
  const plan = policy(evidenceFor(userId), profile);

  return {
    spec_id: `fixture_${profile}_${plan.state}_${question.length}`,
    cached: true,
    adaptation: { state: plan.state, topic_id: plan.topic_id, reason: plan.reason },
    blocks: plan.blocks,
  };
}

export function roadmapFixture(userId: string = DEMO_USER): Roadmap {
  return roadmapFor(userId);
}

export function progressFixture(userId: string = DEMO_USER): ProgressPanel {
  return progressFor(userId);
}

/**
 * Grading a submission.
 *
 * Mastery genuinely moves, in both directions, and `roadmap_changed` reports
 * whether the ordering the learner can see actually changed — not whether the
 * answer was wrong. A judge who answers correctly must still see the roadmap
 * reorder, because that is the demo's centrepiece beat.
 */
export function quizSubmitFixture(
  selectedIndex: number,
  topicId: string,
  userId: string = DEMO_USER,
  elapsedMs = 0,
  answerIndex = 2,
): QuizSubmitResponse {
  const correct = selectedIndex === answerIndex;
  const recorded = recordAnswer(userId, topicId, correct, elapsedMs);

  return {
    correct,
    answer_index: answerIndex,
    mastery: {
      topic_id: topicId,
      before: recorded.before,
      after: recorded.after,
    },
    roadmap_changed: recorded.roadmapChanged,
  };
}

/**
 * Deliberately broken fixtures for the /dev route.
 *
 * Each one turns a row of the failure table into something visibly handled
 * rather than something claimed.
 */
export const BROKEN = {
  /** Five blocks for a profile clamped to one. */
  tooManyForRusty: [EXPLAINER, ROADMAP, PROGRESS, FLASHCARDS, QUIZ] as Block[],

  /** A step long enough to need clamping and a "show more" control. */
  overlongStep: [
    {
      type: 'explainer_card',
      title: 'A step that will not fit',
      steps: [
        {
          text:
            'Begin by observing that the relationship between distance, rate and time ' +
            'is linear in each variable when the other is held constant, which means '.repeat(8),
          expr: 'd = rt',
        },
        { text: 'Then divide.', expr: 'r = d / t' },
      ],
      citation: null,
    },
  ] as Block[],

  /** A type the registry does not know. Must render nothing and not throw. */
  unknownType: [
    { type: 'hologram_explainer', payload: 'from the future' },
    EXPLAINER,
  ] as unknown as Block[],

  /** Nothing at all. Must produce the fallback card. */
  empty: [] as Block[],

  /** Audio whose URL will 404. Must time out and reveal the transcript. */
  deadAudio: [
    { ...(AUDIO as object), audio_url: 'https://example.invalid/missing.mp3' },
  ] as Block[],
};
