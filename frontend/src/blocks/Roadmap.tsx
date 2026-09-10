'use client';

import { useLayoutEffect, useRef } from 'react';

import type { Roadmap as RoadmapBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Ranked topics with mastery. Exactly one step has status `next`.
 *
 * Rows are ranked, not sequenced, so they carry mastery values rather than
 * indices. When a graded answer changes the ranking, rows travel from their old
 * positions to their new ones — the eye follows a topic moving rather than a
 * list blinking into a different order. This is the demo's centrepiece beat.
 *
 * The type weight and mastery value carry meaning alongside colour, so the
 * active row remains identifiable without relying on hue alone.
 */

/**
 * Read a duration token from the DOM rather than hard-coding it.
 *
 * This is what makes `prefers-reduced-motion` work end to end: the media query
 * in tokens.css collapses `--dur-reorder` to 1ms and the animation follows
 * automatically, instead of drifting out of sync with the CSS.
 */
function readMotion(): { duration: number; easing: string } {
  const styles = getComputedStyle(document.body);
  const raw = styles.getPropertyValue('--dur-reorder').trim();
  const parsed = Number.parseFloat(raw);
  const duration = Number.isFinite(parsed)
    ? raw.endsWith('ms')
      ? parsed
      : parsed * 1000
    : 300;
  const easing =
    styles.getPropertyValue('--curve-expressive-in').trim() ||
    'cubic-bezier(0.4, 0.14, 0.3, 1)';
  return { duration, easing };
}

export function Roadmap({ steps }: RoadmapBlock) {
  const rows = useRef(new Map<string, HTMLDivElement>());
  const previousTops = useRef(new Map<string, number>());

  /*
   * FLIP, via the Web Animations API rather than React state.
   *
   * Deliberate: driving this through state would mean calling setState inside
   * an effect, which the React Compiler lint forbids and which has already
   * caught two real bugs in this codebase. `element.animate()` also keeps the
   * animation entirely off the React render path, so a reorder cannot cause a
   * re-render storm mid-transition.
   *
   * useLayoutEffect, not useEffect: the delta must be measured and the row
   * offset applied before the browser paints, or the row is briefly visible in
   * its new position before it animates.
   */
  useLayoutEffect(() => {
    const tops = previousTops.current;
    const next = new Map<string, number>();
    let motion: { duration: number; easing: string } | null = null;

    for (const [topicId, element] of rows.current) {
      const top = element.getBoundingClientRect().top;
      next.set(topicId, top);

      const before = tops.get(topicId);
      if (before === undefined) continue; // First paint: nothing to animate from.

      const delta = before - top;
      if (Math.abs(delta) < 1) continue;

      motion ??= readMotion();
      element.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: motion.duration, easing: motion.easing },
      );
    }

    previousTops.current = next;
  }, [steps]);

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
            <div
              key={step.topic_id}
              ref={(el) => {
                if (el) rows.current.set(step.topic_id, el);
                else rows.current.delete(step.topic_id);
              }}
              data-status={step.status}
              className="flex flex-col gap-s1"
            >
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
