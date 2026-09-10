import type { ReactNode } from 'react';

import { ProfilePill } from './ProfilePill';

/**
 * Fixed chrome. Never generated.
 *
 * Header, progress indicator and ask input are hand-built and identical across
 * every profile. Only the middle region changes, which is what bounds how
 * strange any single generation can look.
 *
 * Chrome type is fixed at text-chrome regardless of profile.
 */
export function Header({ streak }: { streak: number }) {
  return (
    <header className="flex items-center justify-between gap-s2 px-s3 py-s2 bg-surface border-b border-line">
      <ProfilePill />
      <span className="numeric text-chrome text-muted leading-tight">streak {streak}</span>
    </header>
  );
}

export function AskBar({ question }: { question: string }) {
  return (
    <div className="flex items-center gap-s2 px-s3 py-s2 bg-surface border-t border-line">
      <span className="text-chrome text-faint leading-tight truncate">{question}</span>
      <span className="text-chrome font-semibold text-accent leading-tight ml-auto">Ask</span>
    </div>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return <div className="flex flex-col min-h-dvh bg-ground">{children}</div>;
}
