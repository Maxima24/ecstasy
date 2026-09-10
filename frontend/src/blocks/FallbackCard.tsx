import { BlockShell } from './BlockShell';

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
    <BlockShell label="Unavailable" muted>
      <p className="text-body leading-body text-ink">{message}</p>
      <p className="text-quiet leading-body text-muted">{action}</p>
    </BlockShell>
  );
}
