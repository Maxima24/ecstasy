import type { ProgressPanel as ProgressPanelBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Three weakest topics, streak, and the next action.
 *
 * Filled server-side from Postgres. These numbers never come from the model.
 *
 * Values use the same square-ended mastery language as the roadmap, while the
 * next action remains ordinary ink rather than becoming a second accent target.
 */
export function ProgressPanel({
  weakest_topics,
  streak,
  next_action_label,
}: ProgressPanelBlock) {
  return (
    <BlockShell label="Progress">
      <div className="flex items-baseline justify-between gap-s2">
        <h2 className="text-title font-semibold text-ink">{next_action_label}</h2>
        <span className="numeric shrink-0 text-cite leading-tight text-faint">
          {streak} day streak
        </span>
      </div>

      <div className="flex flex-col gap-gap">
        {weakest_topics.map((topic, i) => {
          // These rows are the learner's weak areas, so none of them is `done`.
          // The first is the one next_action_label names, so it takes the
          // accent; the rest stay neutral.
          const isNextAction = i === 0;

          return (
            <div key={topic.topic_id} className="flex flex-col gap-s1">
              <span
                className={`text-row leading-tight ${
                  isNextAction ? 'font-semibold text-accent' : 'text-ink'
                }`}
              >
                {topic.label}
              </span>
              <span className="text-cite leading-tight text-muted">{topic.evidence_claim}</span>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
