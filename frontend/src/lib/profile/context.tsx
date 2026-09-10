'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { DEMO_USER_ID, persistProfile } from '../api';
import type { Profile } from '../types';

/**
 * Profile state, and the flip it drives.
 *
 * The only place the current profile lives. Components do not read it — they
 * read CSS custom properties resolved from the `data-profile` attribute this
 * provider writes. A component that consumes this context to change how it
 * looks is a design error (FRONTEND_PLAN.md R9).
 *
 * Legitimate consumers: the profile switcher, the data layer (which needs the
 * profile as part of a query key), and the screen (which reads `phase` to run
 * the transition).
 *
 * The flip is orchestrated here rather than in an effect on the screen. It
 * begins with a tap, so it belongs in the event handler — and driving it from
 * an effect would mean calling setState synchronously inside one, which
 * triggers the cascading render React warns about.
 */

/** `out` fading away, `in` rising into place, `idle` at rest. */
export type FlipPhase = 'idle' | 'out' | 'in';

type ProfileContextValue = {
  profile: Profile;
  userId: string;
  phase: FlipPhase;
  setProfile: (next: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const DEFAULT_PROFILE: Profile = 'rusty';

/**
 * Read a duration token from the DOM rather than hard-coding it.
 *
 * This is what makes `prefers-reduced-motion` work end to end: the media query
 * in tokens.css collapses the durations to 1 ms, and the JavaScript timing
 * follows automatically instead of drifting out of sync with the CSS.
 */
function readDuration(name: string, fallbackMs: number): number {
  if (typeof window === 'undefined') return fallbackMs;
  const raw = getComputedStyle(document.body).getPropertyValue(name).trim();
  if (!raw) return fallbackMs;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return fallbackMs;
  return raw.endsWith('ms') ? parsed : parsed * 1000;
}

export function ProfileProvider({
  children,
  initialProfile = DEFAULT_PROFILE,
}: {
  children: ReactNode;
  initialProfile?: Profile;
}) {
  const [profile, setProfileState] = useState<Profile>(initialProfile);
  const [phase, setPhase] = useState<FlipPhase>('idle');
  const timers = useRef<number[]>([]);

  // The attribute is written on <body> by the root layout for the first paint,
  // so there is no flash of the wrong profile. From here on this provider owns
  // it.
  useEffect(() => {
    document.body.setAttribute('data-profile', profile);
  }, [profile]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const setProfile = useCallback(
    (next: Profile) => {
      if (next === profile) return;

      timers.current.forEach(clearTimeout);
      timers.current = [];

      const outMs = readDuration('--dur-flip-out', 100);
      const inMs = readDuration('--dur-flip-in', 250);

      setPhase('out');

      timers.current.push(
        window.setTimeout(() => {
          // Flip optimistically. PRD §3.6: persistence is fire and forget, and
          // a failure must never reverse the flip.
          setProfileState(next);
          persistProfile(next);
          setPhase('in');

          timers.current.push(window.setTimeout(() => setPhase('idle'), inMs));
        }, outMs),
      );
    },
    [profile],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, userId: DEMO_USER_ID, phase, setProfile }),
    [profile, phase, setProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error('useProfile must be used inside a ProfileProvider.');
  }
  return value;
}
