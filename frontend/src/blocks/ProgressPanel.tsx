import type { ProgressPanel as ProgressPanelBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Three weakest topics, streak, and the next action.
 *
 * Filled server-side from Postgres. These numbers never come from the model.
 *
 * TODO(codex): visual composition.
 */
export function ProgressPanel({
  weakest_topics,
  streak,
  next_action_label,
}: ProgressPanelBlock) {
  return (
    <BlockShell label="Progress">
      <h2 className="text-title font-semibold text-ink">{next_action_label}</h2>

      <div className="flex flex-col gap-s1">
        {weakest_topics.map((topic) => (
          <div key={topic.topic_id} className="flex items-center gap-s2 text-row text-ink">
            <span className="flex-1 min-w-0">{topic.label}</span>
            <span className="numeric text-cite text-muted">{topic.mastery.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <span className="numeric text-cite text-faint">streak {streak}</span>
    </BlockShell>
  );
}
