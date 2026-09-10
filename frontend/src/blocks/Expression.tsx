import katex from 'katex';

/**
 * Renders one TeX expression.
 *
 * Expressions arrive already marked in dedicated `expr` fields during backend
 * ingestion. The frontend never pattern-matches maths out of prose.
 *
 * THIS IS THE ONE PERMITTED USE OF dangerouslySetInnerHTML IN THIS CODEBASE
 * (FRONTEND_PLAN.md R3). The input is KaTeX's own output, not model output. If
 * a second use appears anywhere in a diff, it is a defect regardless of what it
 * renders.
 *
 * `throwOnError: false` means a malformed expression degrades to its raw source
 * string rather than taking the block down. A learner seeing `3x = 15` as plain
 * text has lost formatting; a learner seeing a fallback card has lost the
 * answer.
 *
 * The expression never wraps mid-equation. It scrolls inside its own container
 * so the page body never scrolls sideways.
 */
export function Expression({ tex }: { tex: string }) {
  let html: string;
  let failed = false;

  try {
    html = katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      // Default output is htmlAndMathml: the visual layout plus a MathML
      // tree for screen readers. Restricting to 'html' would render the maths
      // silently inaccessible.
      strict: false,
    });
  } catch {
    // renderToString should not throw with throwOnError: false, but a
    // catastrophic parse would still leave the learner without the step.
    html = '';
    failed = true;
  }

  if (failed || !html) {
    return (
      <span className="numeric expr py-s1 text-expr font-medium leading-tight text-ink">
        {tex}
      </span>
    );
  }

  return (
    <span
      className="expr block py-s1 text-expr leading-tight text-ink"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
