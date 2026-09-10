'use client';

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

/**
 * The ask input.
 *
 * Any question is accepted and, with no backend configured, returns the same
 * fixture blocks. That is a known limitation and deliberately not worked around:
 * the input is real, so the day a backend appears no UI code changes.
 *
 * Empty and whitespace-only submissions are ignored rather than producing a
 * failure state — there is nothing to tell the learner they did wrong.
 */
export function AskBar({
  question,
  onAsk,
  busy = false,
}: {
  question: string;
  onAsk: (question: string) => void;
  busy?: boolean;
}) {
  return (
    <form
      className="flex items-center gap-s2 px-s3 py-s2 bg-surface border-t border-line"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem('question');
        if (!(input instanceof HTMLInputElement)) return;
        const value = input.value.trim();
        if (!value) return;
        onAsk(value);
        input.blur();
      }}
    >
      <label htmlFor="question" className="sr-only">
        Ask a quantitative question
      </label>
      <input
        id="question"
        name="question"
        type="text"
        defaultValue={question}
        key={question}
        autoComplete="off"
        enterKeyHint="send"
        placeholder="Ask a question"
        className="min-w-0 flex-1 bg-surface text-chrome leading-tight text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 text-chrome font-semibold leading-tight text-accent disabled:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {busy ? 'Asking' : 'Ask'}
      </button>
    </form>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return <div className="flex flex-col min-h-dvh bg-ground">{children}</div>;
}
