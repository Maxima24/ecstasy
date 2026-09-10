import type { ReactNode } from 'react';

import { BlockRenderer } from '@/blocks/BlockRenderer';
import { BROKEN, askFixture, roadmapFixture } from '@/lib/fixtures';
import { previewAfterWrongAnswer } from '@/lib/fixtures/session';
import { applyInvariants } from '@/lib/invariants';
import { PROFILES, parseBlocks, type Block, type Profile } from '@/lib/types';

/**
 * Every profile and every failure state, side by side, from fixtures.
 *
 * Twenty minutes to build, and it turns each row of the failure table into
 * something visibly fixed rather than something claimed. Look at this on a real
 * phone before Day 6 — a panel that reads fine at desktop width can still be
 * wrong at 375px.
 *
 * Not linked from the app. It is a development surface, not a route a learner
 * reaches.
 */
export const metadata = { title: 'Ecstacy — dev' };

const QUESTION = 'If 3x + 5 = 20, what is x?';

function Panel({
  title,
  note,
  profile,
  blocks,
}: {
  title: string;
  note: string;
  profile: Profile;
  blocks: Block[];
}) {
  return (
    <section className="flex flex-col gap-s2">
      <div className="flex flex-col gap-s1">
        <h2 className="font-mono text-sm font-semibold text-ink">{title}</h2>
        <p className="text-xs text-muted">{note}</p>
      </div>
      <div
        data-profile={profile}
        className="bg-ground border border-line p-s3 text-body leading-body tracking-profile"
      >
        <BlockRenderer blocks={blocks} />
      </div>
    </section>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-s4">
      <h1 className="text-lg font-semibold text-ink">{heading}</h1>
      <div className="grid gap-s5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {children}
      </div>
    </section>
  );
}

export default function DevPage() {
  return (
    <div className="min-h-dvh bg-surface p-s5 flex flex-col gap-s6">
      <Group heading="Profiles, after invariants">
        {PROFILES.map((profile) => {
          const raw = askFixture(profile, QUESTION).blocks;
          const clamped = applyInvariants(profile, raw);
          return (
            <Panel
              key={profile}
              title={profile}
              note={`${raw.length} blocks from the backend, ${clamped.length} after the clamp`}
              profile={profile}
              blocks={clamped}
            />
          );
        })}
      </Group>

      <Group heading="Failure states">
        <Panel
          title="Five blocks for rusty"
          note="Clamped to one. The other four never render."
          profile="rusty"
          blocks={applyInvariants('rusty', BROKEN.tooManyForRusty)}
        />
        <Panel
          title="Overlong step"
          note="Must clamp with a show-more control, not overflow the frame."
          profile="rusty"
          blocks={BROKEN.overlongStep}
        />
        <Panel
          title="Unknown block type"
          note="Renders nothing and does not throw. The known block still appears."
          profile="time_poor"
          blocks={parseBlocks(BROKEN.unknownType)}
        />
        <Panel
          title="Empty block array"
          note="Fallback card. Never a blank screen."
          profile="time_poor"
          blocks={BROKEN.empty}
        />
        <Panel
          title="Dead audio URL"
          note="Three second timeout, then the transcript reveals itself."
          profile="hands_free"
          blocks={BROKEN.deadAudio}
        />
        <Panel
          title="Strong, explainer filtered"
          note="Explainer card removed entirely. Drill only."
          profile="strong"
          blocks={applyInvariants('strong', askFixture('strong', QUESTION).blocks)}
        />
      </Group>

      <Group heading="Mastery, before and after">
        <Panel
          title="Roadmap at seed"
          note="Rates weakest at 31%, so it holds `next`."
          profile="time_poor"
          blocks={[roadmapFixture()]}
        />
        <Panel
          title="After a wrong answer on rates"
          note="Rates drops to 26%. Ordering is derived from mastery, so `next` follows the weakest topic. In the app these rows travel to their new positions."
          profile="time_poor"
          blocks={[previewAfterWrongAnswer('rates')]}
        />
      </Group>
    </div>
  );
}
