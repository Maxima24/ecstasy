import type { Roadmap as RoadmapBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Ranked topics with mastery. Exactly one step has status `next`.
 *
 * Rows are ranked, not sequenced, so they carry mastery values rather than
 * indices. Reordering after a graded answer is a FLIP animation at
 * duration-reorder — see the motion spec.
 *
 * The type weight and mastery value carry meaning alongside colour, so the
 * active row remains identifiable without relying on hue alone.
 */
export function Roadmap({ steps }: RoadmapBlock) {
  return (
    <BlockShell label="Roadmap">
      <div className="flex flex-col gap-gap">
        {steps.map((step) => {
          const percentage = Math.round(step.mastery * 100);
          const rowTone =
            step.status === 'next'
              ? 'text-accent font-semibold'
              : step.status === 'done'
                ? 'text-done font-medium'
                : 'text-ink';

          return (
            <div key={step.topic_id} data-status={step.status} className="flex flex-col gap-s1">
              <div className={`flex items-baseline gap-s2 text-row leading-tight ${rowTone}`}>
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{step.status}. </span>
                  {step.label}
                </span>
                <span className="numeric shrink-0 text-cite font-regular">{percentage}%</span>
              </div>
              <span
                role="progressbar"
                aria-label={`${step.label} mastery`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="h-s1 w-full overflow-hidden bg-sunk"
              >
                <span
                  className={`block h-full ${step.status === 'next' ? 'bg-accent' : 'bg-done'}`}
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
