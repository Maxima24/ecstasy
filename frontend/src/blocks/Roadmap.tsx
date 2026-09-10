import type { Roadmap as RoadmapBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Ranked topics with mastery. Exactly one step has status `next`.
 *
 * Rows are ranked, not sequenced, so they carry mastery values rather than
 * indices. Reordering after a graded answer is a FLIP animation at
 * duration-reorder — see the motion spec.
 *
 * TODO(codex): visual composition. Bar treatment, how `done` and `later`
 * differentiate, the reorder animation.
 */
export function Roadmap({ steps }: RoadmapBlock) {
  return (
    <BlockShell label="Roadmap">
      <div className="flex flex-col gap-s1">
        {steps.map((step) => (
          <div
            key={step.topic_id}
            data-status={step.status}
            className={`flex items-center gap-s2 text-row ${
              step.status === 'next' ? 'text-accent font-semibold' : 'text-ink'
            }`}
          >
            <span className="flex-1 min-w-0">{step.label}</span>
            <span className="w-11 h-[3px] bg-sunk overflow-hidden">
              <span
                className={`block h-full ${step.status === 'next' ? 'bg-accent' : 'bg-done'}`}
                style={{ width: `${Math.round(step.mastery * 100)}%` }}
              />
            </span>
            <span className="numeric text-cite text-muted">{step.mastery.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}
