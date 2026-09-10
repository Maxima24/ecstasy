'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEMO_USER_ID, persistProfile } from '../api';
import type { Profile } from '../types';

/**
 * Profile state.
 *
 * The only place the current profile lives. Components do not read it — they
 * read CSS custom properties resolved from the `data-profile` attribute this
 * provider writes. A component that consumes this context to change how it
 * looks is a design error (FRONTEND_PLAN.md R9).
 *
 * Legitimate consumers are the profile switcher itself and the data layer,
 * which needs the profile as part of a query key.
 */

type ProfileContextValue = {
  profile: Profile;
  userId: string;
  setProfile: (next: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const DEFAULT_PROFILE: Profile = 'rusty';

export function ProfileProvider({
  children,
  initialProfile = DEFAULT_PROFILE,
}: {
  children: ReactNode;
  initialProfile?: Profile;
}) {
  const [profile, setProfileState] = useState<Profile>(initialProfile);

  // The attribute is written on <body> by the root layout for the first paint,
  // so there is no flash of the wrong profile. From here on this provider owns
  // it.
  useEffect(() => {
    document.body.setAttribute('data-profile', profile);
  }, [profile]);

  const setProfile = useCallback((next: Profile) => {
    // Flip optimistically. PRD §3.6: the persistence call is fire and forget,
    // and a failure must never reverse the flip.
    setProfileState(next);
    persistProfile(next);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, userId: DEMO_USER_ID, setProfile }),
    [profile, setProfile],
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
