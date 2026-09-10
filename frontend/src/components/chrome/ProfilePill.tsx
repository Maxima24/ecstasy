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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="font-mono text-chrome rounded-token bg-accent-bg text-accent px-s2 py-s1 leading-tight"
      >
        {LABELS[profile]}
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-s1 z-10 bg-surface border border-line rounded-token overflow-hidden min-w-36"
        >
          {PROFILES.map((p) => (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === profile}
                onClick={() => choose(p)}
                className={`w-full text-left font-mono text-chrome px-s3 py-s2 leading-tight ${
                  p === profile ? 'text-accent' : 'text-ink'
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
