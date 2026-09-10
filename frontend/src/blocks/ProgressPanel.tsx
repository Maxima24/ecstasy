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
          const percentage = Math.round(topic.mastery * 100);
          // These rows are the learner's deficits, so none of them is `done`.
          // Green here would congratulate someone on what they are worst at.
          // The first is the one `next_action_label` names, so it takes the
          // accent; the rest stay neutral.
          const isNextAction = i === 0;

          return (
            <div key={topic.topic_id} className="flex flex-col gap-s1">
              <div
                className={`flex items-baseline gap-s2 text-row leading-tight ${
                  isNextAction ? 'font-semibold text-accent' : 'text-ink'
                }`}
              >
                <span className="min-w-0 flex-1">{topic.label}</span>
                <span
                  className={`numeric shrink-0 text-cite ${
                    isNextAction ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {percentage}%
                </span>
              </div>
              <span
                role="progressbar"
                aria-label={`${topic.label} mastery`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="h-s1 w-full overflow-hidden bg-sunk"
              >
                <span
                  className={`block h-full ${isNextAction ? 'bg-accent' : 'bg-faint'}`}
                  style={{ width: `${percentage}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}
