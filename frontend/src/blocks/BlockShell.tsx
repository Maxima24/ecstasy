import type { ReactNode } from 'react';

/**
 * A block: a raised surface on the tinted ground, with the accent carried on
 * its leading edge.
 *
 * Supersedes the earlier rail-only direction (no cards, no shadows, no fills).
 * That was defensible on space grounds — at 375px, card padding and borders are
 * expensive — but executed at this scale it read as unfinished rather than
 * restrained. Depth gives each block an unambiguous edge and gives the screen a
 * focal plane it did not have.
 *
 * The accent still arrives through structure rather than decoration: a 3px edge
 * on the leading side, `--line` when the block is muted. Ground, ink, surface
 * and the `done` green stay identical across all four profiles, so the app
 * never stops looking like itself when the profile changes.
 *
 * The label is not decoration. It names what the block is, on a screen where
 * the middle region is generated and a reader cannot assume what they are
 * looking at. It is required, not optional.
 *
 * Sentence case, no letter-spacing: a tracked-out ALL-CAPS eyebrow above every
 * heading is template chrome that appears whatever the subject. The monospace
 * face stays, because this product's voice is numeric — mastery values, timers,
 * answer options and expressions are all mono, and the label belongs to that
 * register.
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
      className={`flex h-full flex-col gap-gap rounded-block border border-l-4 bg-surface p-s4 shadow-block sm:p-s5 ${
        muted ? 'border-line' : 'border-line border-l-accent'
      }`}
    >
      <span className="flex items-center gap-s2 font-mono text-label leading-tight text-muted">
        <span
          className={`size-s1 rounded-full ${muted ? 'bg-line-strong' : 'bg-accent'}`}
          aria-hidden="true"
        />
        {label}
      </span>
      {children}
    </section>
  );
}
