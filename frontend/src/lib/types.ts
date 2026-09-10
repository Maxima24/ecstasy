/**
 * The block schema.
 *
 * This is the typed contract between the data layer and the block components.
 * It mirrors the backend's Pydantic schema (FRONTEND_PLAN.md §4). If the two
 * disagree, the backend wins and this file is wrong.
 *
 * `type` is a literal discriminant on every block, so `switch (block.type)`
 * narrows exhaustively.
 */

export const PROFILES = ['rusty', 'time_poor', 'hands_free', 'strong'] as const;
export type Profile = (typeof PROFILES)[number];

export type BlockType =
  | 'explainer_card'
  | 'audio_explainer'
  | 'quiz'
  | 'roadmap'
  | 'flashcards'
  | 'progress_panel';

export type Citation = {
  chunk_id: string;
  label: string;
};

/** A worked-solution step. `expr` is TeX, marked during ingestion. */
export type ExplainerStep = {
  text: string;
  expr?: string | null;
};

export type ExplainerCard = {
  type: 'explainer_card';
  title: string;
  /** Two to five. An array, not a prose body — `rusty` depends on segmentation. */
  steps: ExplainerStep[];
  citation?: Citation | null;
};

export type AudioExplainer = {
  type: 'audio_explainer';
  script: string;
  /** Ready to play by the time /ask responds. The frontend never calls TTS. */
  audio_url: string;
  duration_ms: number;
  transcript_shown: boolean;
};

export type QuizQuestion = {
  id: string;
  stem: string;
  stem_expr: string | null;
  /** Five. */
  options: string[];
  topic_id: string;
  /** Shipped up front so grading is instant. Acceptable: this is a demo. */
  answer_index: number;
  rationale: string;
};

export type Quiz = {
  type: 'quiz';
  /** Non-null only for `strong`. */
  timer_seconds: number | null;
  questions: QuizQuestion[];
};

export type RoadmapStatus = 'next' | 'done' | 'later';

export type RoadmapStep = {
  topic_id: string;
  label: string;
  /** 0..1, from Postgres. Never from the model. */
  mastery: number;
  status: RoadmapStatus;
};

export type Roadmap = {
  type: 'roadmap';
  /** Exactly one step has status `next`. */
  steps: RoadmapStep[];
};

export type Flashcard = {
  front: string;
  back: string;
  topic_id: string;
};

export type Flashcards = {
  type: 'flashcards';
  cards: Flashcard[];
};

export type WeakTopic = {
  topic_id: string;
  label: string;
  mastery: number;
};

export type ProgressPanel = {
  type: 'progress_panel';
  /** Exactly three. */
  weakest_topics: WeakTopic[];
  streak: number;
  next_action_label: string;
};

export type Block =
  | ExplainerCard
  | AudioExplainer
  | Quiz
  | Roadmap
  | Flashcards
  | ProgressPanel;

/** Narrow a Block union member by its discriminant. */
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

// ---------------------------------------------------------------------------
// Requests and responses
// ---------------------------------------------------------------------------

export type AskRequest = {
  user_id: string;
  profile: Profile;
  question: string;
};

export type AskResponse = {
  spec_id: string;
  /** Dev overlay only. Never shown to learners. */
  cached: boolean;
  blocks: Block[];
};

export type QuizSubmitRequest = {
  user_id: string;
  question_id: string;
  topic_id: string;
  selected_index: number;
  elapsed_ms: number;
};

export type QuizSubmitResponse = {
  correct: boolean;
  answer_index: number;
  mastery: {
    topic_id: string;
    before: number;
    after: number;
  };
  /**
   * Decides whether to invalidate the roadmap and progress queries. It exists
   * so the frontend does not refetch on every answer — invalidate only when
   * this is true.
   */
  roadmap_changed: boolean;
};

export type ProfileRequest = {
  user_id: string;
  profile: Profile;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

// ---------------------------------------------------------------------------
// Defensive validation
// ---------------------------------------------------------------------------

const BLOCK_TYPES = new Set<string>([
  'explainer_card',
  'audio_explainer',
  'quiz',
  'roadmap',
  'flashcards',
  'progress_panel',
]);

export function isProfile(value: unknown): value is Profile {
  return typeof value === 'string' && (PROFILES as readonly string[]).includes(value);
}

/**
 * Shape check only.
 *
 * The backend has already validated against the Pydantic schema, so this should
 * never reject anything in practice. It exists so that a malformed block is
 * dropped at the boundary rather than throwing inside a component during the
 * profile flip.
 */
export function isBlock(value: unknown): value is Block {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && BLOCK_TYPES.has(type);
}

/** Keep the blocks that are structurally usable; drop the rest silently. */
export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isBlock);
}
