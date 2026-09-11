'use client';

import { useProfile } from '@/lib/profile/context';
import { PROFILES, type Profile } from '@/lib/types';

/**
 * The delivery-preference switcher.
 *
 * A segmented control at every width, not only on desktop. The previous version
 * showed segments at `lg` and a dropdown below it, which inverted the priority:
 * this product is mobile-only by specification, and the switch is the thing
 * being demonstrated. Two taps to reach the centrepiece is one too many.
 *
 * Labels are short so four segments fit at 375px, and clearer than the internal
 * profile ids as a side effect — a judge reads "Drill" faster than "Strong".
 *
 * Each setting carries what it actually changes. The PRD's success criterion is
 * that someone watching the screen rebuild "understands why without being
 * told"; four bare words cannot do that, and a caption naming the current
 * setting can.
 *
 * This component legitimately reads the profile — it is the control for it. The
 * rule it must not break is that no component reads the profile to change how
 * it *looks*. This one reads it to show which option is selected; its own
 * appearance comes from the same tokens as everything else.
 */

const LABELS: Record<Profile, string> = {
  rusty: 'Rusty',
  time_poor: 'Quick',
  hands_free: 'Audio',
  strong: 'Drill',
};

/** What each setting does, from the learner's side rather than the system's. */
const DESCRIPTIONS: Record<Profile, string> = {
  rusty: 'Worked examples, larger type, one thing at a time',
  time_poor: 'Roadmap first, compact, built for short sessions',
  hands_free: 'Audio leads, transcript below',
  strong: 'Timed drills, no worked examples',
};

export function ProfilePill() {
  const { profile, setProfile } = useProfile();

  return (
    <div className="flex min-w-0 flex-col gap-s1">
      <div
        role="radiogroup"
        aria-label="How this is taught"
        className="flex items-center gap-s1 rounded-token border border-line bg-surface-soft p-s1"
      >
        {PROFILES.map((option) => {
          const selected = option === profile;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setProfile(option)}
              className={`min-w-0 flex-1 rounded-token px-s2 py-s1 font-mono text-chrome leading-tight transition-colors duration-feedback ease-productive-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? 'bg-accent-bg font-semibold text-accent'
                  : 'text-muted hover:bg-sunk hover:text-ink'
              }`}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>

      {/*
        Names the current setting rather than leaving it to be inferred from the
        screen rebuilding. `aria-live` so a screen reader hears the change too —
        the flip is otherwise entirely silent.
      */}
      <p className="truncate text-cite leading-tight text-muted" aria-live="polite">
        {DESCRIPTIONS[profile]}
      </p>
    </div>
  );
}
