import type { AudioExplainer, Block, Profile } from './types';

/**
 * Profile invariants.
 *
 * Applied after parsing, before render. The model chooses within the
 * constraint; code guarantees the shape. This is what makes the demo safe
 * regardless of what comes back from generation.
 *
 * Every function here is total. They run on whatever the backend returned,
 * including an empty array, a `time_poor` response with no roadmap, or a
 * `hands_free` response with no audio. None of them may throw — an exception
 * here happens before any error boundary exists to catch it.
 */

function hasAudio(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === 'audio_explainer');
}

/**
 * Derive something speakable from a non-audio block.
 *
 * We cannot fabricate an `audio_url` — only the backend can produce one. What
 * this guarantees is that the audio *slot* exists at the top of the screen,
 * with the transcript already revealed. That lands in the documented failure
 * path for missing audio (FRONTEND_PLAN.md §15) rather than in a blank screen,
 * and it keeps `hands_free` structurally distinct from the other profiles even
 * when generation misses.
 */
function toAudio(block: Block): AudioExplainer {
  let script: string;

  switch (block.type) {
    case 'explainer_card':
      script = [block.title, ...block.steps.map((s) => s.text)].join('. ');
      break;
    case 'quiz':
      script = block.questions[0]?.stem ?? '';
      break;
    case 'flashcards':
      script = block.cards[0]?.front ?? '';
      break;
    case 'progress_panel':
      script = block.next_action_label;
      break;
    case 'roadmap':
      script = block.steps.find((s) => s.status === 'next')?.label ?? '';
      break;
    case 'audio_explainer':
      return block;
  }

  return {
    type: 'audio_explainer',
    script,
    audio_url: '',
    duration_ms: 0,
    // No URL means the player cannot play. Reveal the transcript immediately
    // rather than showing a control that does nothing.
    transcript_shown: true,
  };
}

/** Hoist the roadmap to the front. A no-op when there isn't one. */
function roadmapFirst(blocks: Block[]): Block[] {
  const roadmap = blocks.find((b) => b.type === 'roadmap');
  if (!roadmap) return blocks;
  return [roadmap, ...blocks.filter((b) => b !== roadmap)];
}

export const INVARIANTS: Record<Profile, (blocks: Block[]) => Block[]> = {
  /** Never more than one block. A re-learner gets one thing to look at. */
  rusty: (blocks) => blocks.slice(0, 1),

  /** Roadmap first, next step highlighted. */
  time_poor: (blocks) => roadmapFirst(blocks),

  /** Audio at the top, always. */
  hands_free: (blocks) => {
    if (blocks.length === 0) return blocks;
    if (hasAudio(blocks)) {
      // Present but not first: hoist it.
      const audio = blocks.find((b) => b.type === 'audio_explainer')!;
      return [audio, ...blocks.filter((b) => b !== audio)];
    }
    return [toAudio(blocks[0]), ...blocks.slice(1)];
  },

  /** No explainer card, ever. Near test-ready learners drill. */
  strong: (blocks) => blocks.filter((b) => b.type !== 'explainer_card'),
};

/**
 * Apply the clamp for a profile.
 *
 * Returns a new array; never mutates the input, because the same block array
 * is held in the query cache and may be clamped again for a different profile.
 */
export function applyInvariants(profile: Profile, blocks: Block[]): Block[] {
  const clamp = INVARIANTS[profile];
  if (!clamp) return blocks;
  return clamp([...blocks]);
}
