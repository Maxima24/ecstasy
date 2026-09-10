import 'server-only';

import type {
  AskResponse,
  Block,
  ProgressPanel,
  Profile,
  QuizSubmitResponse,
  Roadmap,
} from '../types';
import { progressFor, recordAnswer, roadmapFor } from './session';

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

const ROADMAP_STEPS: Roadmap['steps'] = [
  { topic_id: 'rates', label: 'Rates and speed', mastery: 0.31, status: 'next' },
  { topic_id: 'ratios', label: 'Ratios', mastery: 0.72, status: 'done' },
  { topic_id: 'percentages', label: 'Percentages', mastery: 0.44, status: 'later' },
  { topic_id: 'work_time', label: 'Work and time', mastery: 0.38, status: 'later' },
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
    { topic_id: 'rates', label: 'Rates and speed', mastery: 0.31 },
    { topic_id: 'work_time', label: 'Work and time', mastery: 0.38 },
    { topic_id: 'percentages', label: 'Percentages', mastery: 0.44 },
  ],
  streak: 4,
  next_action_label: 'Fix rates next',
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
 * What the backend would return per profile, BEFORE invariants are applied.
 *
 * Deliberately imperfect. `rusty` gets three blocks so the clamp has something
 * to do, and `strong` gets an explainer card so the filter is exercised. A
 * fixture that already satisfies the invariant tests nothing.
 */
const SCREENS: Record<Profile, Block[]> = {
  rusty: [EXPLAINER, ROADMAP, PROGRESS],
  time_poor: [PROGRESS, ROADMAP, FLASHCARDS],
  hands_free: [AUDIO, EXPLAINER, FLASHCARDS],
  // ROADMAP is not optional here. `strong` is the only profile whose fixture
  // carries a quiz, so it is the only screen where an answer can be given — and
  // the roadmap must be visible on that screen or the reorder, which is the
  // demo's centrepiece, happens somewhere nobody is looking. The drill still
  // opens the screen, per the profile's contract.
  strong: [EXPLAINER, QUIZ, ROADMAP, PROGRESS],
};

/**
 * Blocks for a profile, with the roadmap and progress panel filled from live
 * session state.
 *
 * The static ROADMAP and PROGRESS constants above are the shape; the session is
 * the truth. Substituting here is what makes a fresh ask reflect mastery the
 * learner has already changed, rather than replaying the seed values.
 */
export function askFixture(
  profile: Profile,
  question: string,
  userId: string = DEMO_USER,
): AskResponse {
  const blocks = (SCREENS[profile] ?? []).map((block) => {
    if (block.type === 'roadmap') return roadmapFor(userId);
    if (block.type === 'progress_panel') return progressFor(userId);
    return block;
  });

  return {
    spec_id: `fixture_${profile}_${question.length}`,
    cached: true,
    blocks,
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
): QuizSubmitResponse {
  const answerIndex = 2;
  const correct = selectedIndex === answerIndex;
  const recorded = recordAnswer(userId, topicId, correct);

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
