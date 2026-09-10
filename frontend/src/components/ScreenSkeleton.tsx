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
      <div className="border-l-2 border-line pl-s3 flex flex-col gap-gap">
        <span className="sr-only">Loading</span>
        <div className="h-3 w-16 bg-sunk" />
        <div className="h-4 w-3/5 bg-sunk" />
        <div className="h-3 w-11/12 bg-sunk" />
        <div className="h-6 w-2/5 bg-sunk" />
        <div className="h-3 w-4/5 bg-sunk" />
        <div className="h-6 w-1/3 bg-sunk" />
      </div>
    </div>
  );
}
