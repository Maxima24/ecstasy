import type { ReactNode } from 'react';

/**
 * The rail, and the block label.
 *
 * Every block uses this. The label is not decoration — with the rail running
 * down the whole screen it is the second cue telling a reader where one block
 * ends and which controls belong to it. It is required, not optional.
 *
 * Sentence case, not uppercase, and no letter-spacing: a tracked-out ALL-CAPS
 * eyebrow above every heading is template chrome that appears whatever the
 * subject. The monospace face stays, because this product's voice is numeric —
 * mastery values, timers, answer options and expressions are all mono, and the
 * label belongs to that register rather than being decoration.
 *
 * `muted` drops the accent from the rail for blocks that are not the focus of
 * the screen. Labels stay quiet either way: accent belongs to the structural
 * rail, not to eyebrow copy.
 */
export function BlockShell({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`border-l-2 pl-s3 flex flex-col gap-gap ${
        muted ? 'border-line' : 'border-accent'
      }`}
    >
      <span className="font-mono text-label leading-tight text-faint">
        {label}
      </span>
      {children}
    </section>
  );
}
