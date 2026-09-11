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
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex items-center justify-between gap-s3 px-s3 py-s3 sm:px-s5 lg:px-s6">
        <div className="flex min-w-0 items-center gap-s3">
          <span
            className="grid size-s6 shrink-0 place-items-center rounded-token border border-accent bg-accent-bg font-mono text-chrome font-semibold text-accent"
            aria-hidden="true"
          >
            E
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-chrome font-semibold text-ink">Ecstacy</span>
            <span className="hidden text-cite text-muted sm:block">Adaptive quantitative prep</span>
          </span>
        </div>

        <div className="flex items-center gap-s2 sm:gap-s3">
          <span className="hidden items-center gap-s2 rounded-token border border-line bg-surface-soft px-s2 py-s1 text-chrome text-muted sm:flex">
            <span className="size-s1 rounded-full bg-done" aria-hidden="true" />
            <span className="numeric">{streak} day streak</span>
          </span>
          <ProfilePill />
        </div>
      </div>
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
    <footer className="composer-dock sticky bottom-0 z-20 border-t border-line bg-surface/95 px-s3 pt-s3 backdrop-blur sm:px-s5 lg:px-s6">
      <form
        className="mx-auto flex max-w-reading items-center gap-s2 rounded-block border border-line-strong bg-surface p-s1 shadow-block focus-within:border-accent"
        aria-busy={busy}
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
          placeholder="Ask another quantitative question"
          className="min-w-0 flex-1 bg-transparent px-s3 py-s2 text-chrome leading-tight text-ink outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-token bg-ink px-s4 py-s2 text-chrome font-semibold leading-tight text-surface transition-opacity duration-feedback ease-productive-out disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? 'Thinking' : 'Ask'}
        </button>
      </form>
    </footer>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground lg:p-s5">
      <div className="app-frame mx-auto flex w-full max-w-app flex-col overflow-hidden bg-surface-soft shadow-shell lg:rounded-block lg:border lg:border-line">
        {children}
      </div>
    </div>
  );
}
