import { BlockShell } from '@/blocks/BlockShell';

/**
 * Loading state.
 *
 * A skeleton, never a spinner. A spinner says "something is happening"; a
 * skeleton says "a block with two steps is about to appear here", and because
 * it occupies the same box nothing shifts when the content lands. That is most
 * of the CLS budget, earned by layout rather than by animation.
 *
 * Build against the 600 ms fixture delay. Skeletons only ever seen against a
 * warm cache will be wrong on the day the cache misses.
 */
export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-block min-h-80" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading response</span>
      <BlockShell label="Loading" muted>
        <div className="flex flex-col gap-gap" aria-hidden="true">
          <div className="h-s3 w-2/3 bg-sunk" />
          <div className="flex items-start gap-s2">
            <div className="h-s2 w-s5 shrink-0 bg-sunk" />
            <div className="flex min-w-0 flex-1 flex-col gap-s2">
              <div className="h-s2 w-full bg-sunk" />
              <div className="h-s3 w-2/5 bg-sunk" />
            </div>
          </div>
          <div className="flex items-start gap-s2">
            <div className="h-s2 w-s5 shrink-0 bg-sunk" />
            <div className="flex min-w-0 flex-1 flex-col gap-s2">
              <div className="h-s2 w-4/5 bg-sunk" />
              <div className="h-s3 w-1/3 bg-sunk" />
            </div>
          </div>
        </div>
      </BlockShell>
    </div>
  );
}
