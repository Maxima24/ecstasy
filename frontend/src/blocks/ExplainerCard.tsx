import type { ExplainerCard as ExplainerCardBlock } from '@/lib/types';

import { BlockShell } from './BlockShell';

/**
 * Segmented worked example. `rusty` depends on the segmentation — steps are an
 * array, never a prose body.
 *
 * TODO(codex): visual composition. Step indices, expression treatment, the
 * "show more" control for a clamped step. Props and tokens are fixed.
 */
export function ExplainerCard({ title, steps, citation }: ExplainerCardBlock) {
  return (
    <BlockShell label="Explainer">
      <h2 className="text-title font-semibold text-ink">{title}</h2>

      {steps.map((step, i) => (
        <div key={i} className="flex flex-col gap-s1 max-w-(--measure)">
          <span className="text-body leading-body text-ink">{step.text}</span>
          {step.expr ? (
            <span className="numeric expr text-expr text-ink">{step.expr}</span>
          ) : null}
        </div>
      ))}

      {citation ? (
        <span className="font-mono text-cite text-faint">{citation.label}</span>
      ) : null}
    </BlockShell>
  );
}
