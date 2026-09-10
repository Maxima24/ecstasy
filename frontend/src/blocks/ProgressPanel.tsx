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
        {weakest_topics.map((topic) => {
          const percentage = Math.round(topic.mastery * 100);

          return (
            <div key={topic.topic_id} className="flex flex-col gap-s1">
              <div className="flex items-baseline gap-s2 text-row leading-tight text-ink">
                <span className="min-w-0 flex-1">{topic.label}</span>
                <span className="numeric shrink-0 text-cite text-muted">{percentage}%</span>
              </div>
              <span
                role="progressbar"
                aria-label={`${topic.label} mastery`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="h-s1 w-full overflow-hidden bg-sunk"
              >
                <span className="block h-full bg-done" style={{ width: `${percentage}%` }} />
              </span>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
