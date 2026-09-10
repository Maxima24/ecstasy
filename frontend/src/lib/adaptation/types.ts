import type { ProgressPanel, Roadmap } from '../types';

export type ObservedAnswer = {
  correct: boolean;
  elapsed_ms: number;
  /** Monotonic within one fixture session; no wall-clock time is needed. */
  sequence: number;
};

export type TopicEvidence = {
  topic_id: string;
  label: string;
  prerequisite_topic_id: string | null;
  recent: ObservedAnswer[];
};

/** Everything the policy is allowed to use when choosing the next screen. */
export type SessionEvidence = {
  user_id: string;
  revision: number;
  focus_topic_id: string;
  topics: Record<string, TopicEvidence>;
  roadmap: Roadmap;
  progress: ProgressPanel;
};

