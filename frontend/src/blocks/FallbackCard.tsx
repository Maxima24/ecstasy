/**
 * Shown in place of a block that could not render, and in place of the whole
 * screen when the block array is empty.
 *
 * States what happened and what to do. Does not apologise (FRONTEND_PLAN.md
 * §15).
 */
export function FallbackCard({
  message = 'This part could not be shown.',
  action = 'Ask again, or switch profile.',
}: {
  message?: string;
  action?: string;
}) {
  return (
    <div className="border-l-2 border-line pl-s3 flex flex-col gap-s1">
      <span className="font-mono text-label tracking-label uppercase text-faint leading-tight">
        Unavailable
      </span>
      <span className="text-body text-ink">{message}</span>
      <span className="text-quiet text-muted">{action}</span>
    </div>
  );
}
