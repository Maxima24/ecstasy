'use client';

import { useState } from 'react';

import { useProfile } from '@/lib/profile/context';
import { PROFILES, type Profile } from '@/lib/types';

const LABELS: Record<Profile, string> = {
  rusty: 'Rusty',
  time_poor: 'Time-poor',
  hands_free: 'Hands-free',
  strong: 'Strong',
};

/**
 * The profile switcher.
 *
 * Chrome: hand-built, identical across every profile, and never generated. Its
 * type size is fixed at text-chrome so the flip reads as the content changing
 * rather than the whole app zooming.
 *
 * One of only two rounded things in the design (the other is the audio play
 * control), because it is one of only two things that is genuinely enclosed.
 */
export function ProfilePill() {
  const { profile, setProfile } = useProfile();
  const [open, setOpen] = useState(false);

  function choose(next: Profile) {
    setProfile(next);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="hidden items-center gap-s1 rounded-token border border-line bg-surface-soft p-s1 lg:flex" aria-label="Learning profile">
        {PROFILES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === profile}
            onClick={() => choose(item)}
            className={`rounded-token px-s2 py-s1 font-mono text-chrome leading-tight transition-colors duration-feedback ease-productive-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              item === profile
                ? 'bg-accent-bg font-semibold text-accent'
                : 'text-muted hover:bg-sunk hover:text-ink'
            }`}
          >
            {LABELS[item]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="profile-options"
        className="flex items-center gap-s2 rounded-token border border-line bg-accent-bg px-s2 py-s2 font-mono text-chrome font-medium leading-tight text-accent lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span>{LABELS[profile]}</span>
        <svg viewBox="0 0 12 12" className="size-s2" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open ? (
        <ul
          id="profile-options"
          role="listbox"
          className="absolute right-0 top-full z-30 mt-s1 w-max min-w-full overflow-hidden rounded-token border border-line bg-surface p-s1 shadow-block lg:hidden"
        >
          {PROFILES.map((p) => (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === profile}
                onClick={() => choose(p)}
                className={`w-full rounded-token px-s3 py-s2 text-left font-mono text-chrome leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  p === profile ? 'bg-accent-bg font-semibold text-accent' : 'text-ink'
                }`}
              >
                {LABELS[p]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
