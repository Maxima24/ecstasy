'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { BlockRenderer } from '@/blocks/BlockRenderer';
import { BlockShell } from '@/blocks/BlockShell';
import { submitAnswer } from '@/lib/api';
import { applyInvariants } from '@/lib/invariants';
import { useProfile } from '@/lib/profile/context';
import {
  askQueryOptions,
  invalidateAfterAnswer,
  prefetchAllProfiles,
  progressQueryOptions,
  roadmapQueryOptions,
} from '@/lib/query/keys';
import type { Block, ProgressPanel, Roadmap } from '@/lib/types';

import { AskBar, Frame, Header } from './chrome/Chrome';
import { ScreenSkeleton } from './ScreenSkeleton';

const DEMO_QUESTION = 'If 3x + 5 = 20, what is x?';

/** Pull a block of a given type out of an ask response, to seed a live query. */
function blockOfType<T extends Block['type']>(
  blocks: Block[] | undefined,
  type: T,
): Extract<Block, { type: T }> | undefined {
  return blocks?.find((b): b is Extract<Block, { type: T }> => b.type === type);
}

/**
 * The one screen. Its contents change.
 *
 * Chrome is fixed and hand-built; only the middle region is generated. The
 * profile flip is the single orchestrated moment — content fades out over
 * --dur-flip-out, then the incoming blocks rise 8px into place over
 * --dur-flip-in. Nothing else animates except the roadmap reorder.
 */
export function Screen({ initialQuestion = DEMO_QUESTION }: { initialQuestion?: string }) {
  const { profile, phase } = useProfile();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState(initialQuestion);

  const { data, isPending, isFetching, isError, error, refetch } = useQuery(
    askQueryOptions(question, profile),
  );

  /*
   * Roadmap and progress are live, seeded from the ask response.
   *
   * They cannot be read from `data.blocks` directly: the ask key uses
   * staleTime Infinity, so its roadmap block is frozen at the moment it was
   * fetched and would never show mastery the learner has since changed. Seeding
   * via initialData means no second load flash on first paint.
   */
  const { data: roadmap } = useQuery(
    roadmapQueryOptions(blockOfType(data?.blocks, 'roadmap')),
  );
  const { data: progress } = useQuery(
    progressQueryOptions(blockOfType(data?.blocks, 'progress_panel')),
  );

  /*
   * Warm the other three profiles once an answer lands.
   *
   * This is what makes the proxy affordable: the extra hop is paid here, on
   * initial load where the budget is 2500 ms, instead of on the flip where it
   * is 150 ms. After this resolves every flip is a cache read.
   *
   * Keyed on the question, so asking something new warms the other profiles for
   * that question too rather than firing once for the life of the session.
   *
   * Not setState, so no cascading render — this only fills the query cache.
   */
  const warmedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!data || warmedFor.current === question) return;
    warmedFor.current = question;
    prefetchAllProfiles(queryClient, question, profile);
  }, [data, queryClient, question, profile]);

  async function handleAnswered(answer: {
    questionId: string;
    topicId: string;
    selectedIndex: number;
    elapsedMs: number;
  }) {
    try {
      const result = await submitAnswer(answer);
      // Only when the flag says so. An unconditional invalidate would make the
      // reorder moment meaningless — and now that something is subscribed to
      // these keys, this actually refetches and re-renders.
      invalidateAfterAnswer(queryClient, result.roadmap_changed);
    } catch {
      // The learner already saw their result — grading was local. Failing to
      // record it must not disturb the screen.
    }
  }

  // Invariants run after parsing, before render. The model chooses within the
  // constraint; this guarantees the shape.
  const clamped = data ? applyInvariants(profile, data.blocks) : [];

  /*
   * Substitute the live roadmap and progress into the clamped blocks.
   *
   * Done here rather than inside the components so blocks stay presentational
   * and never learn about queries (R9's sibling concern: data belongs in the
   * screen).
   */
  const blocks: Block[] = clamped.map((block) => {
    if (block.type === 'roadmap' && roadmap) return roadmap as Roadmap;
    if (block.type === 'progress_panel' && progress) return progress as ProgressPanel;
    return block;
  });

  const opacityTransition =
    phase === 'out'
      ? 'opacity-0 duration-flip-out ease-expressive-out'
      : 'opacity-100 duration-flip-in ease-expressive-in';
  const transformTransition =
    phase === 'out'
      ? '-translate-y-s2 duration-flip-out ease-expressive-out'
      : 'translate-y-0 duration-flip-in ease-expressive-in';

  return (
    <Frame>
      <Header streak={progress?.streak ?? 0} />

      <main className="flex-1 px-s3 py-s4">
        {isPending ? (
          <ScreenSkeleton />
        ) : isError ? (
          <BlockShell label="Connection" muted>
            <p className="text-body leading-body text-ink">
              {error instanceof Error ? error.message : 'The answer could not be loaded.'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="self-start text-left text-quiet font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try again
            </button>
          </BlockShell>
        ) : (
          <div className={`transition-opacity ${opacityTransition}`}>
            <div className={`transition-transform ${transformTransition}`}>
              {/*
                Why this screen looks the way it does.

                Rendered above the generated region, visible without any
                interaction. This is the difference between a system that
                adapts and one that appears to: the learner is told what was
                observed and what the product decided because of it. It is not
                an error state and must never be styled as one.
              */}
              {data?.adaptation ? (
                <p
                  className="mb-block text-quiet leading-body text-muted"
                  role="status"
                >
                  {data.adaptation.reason}
                </p>
              ) : null}
              {/*
                Keyed on question AND profile, for two reasons.

                Question: BlockRenderer keys children by `${type}-${index}`, so
                without this a second question reuses the same Quiz instance and
                its `selected` state survives — the learner asks something fresh
                and the quiz is already showing as answered.

                Profile: remounting is what replays the CSS entrance animation,
                so the blocks stagger in on every flip rather than only on first
                paint. A flip is a cache read, so this costs no network.
              */}
              <BlockRenderer
                key={`${question}::${profile}`}
                blocks={blocks}
                onQuizAnswered={handleAnswered}
              />
            </div>
          </div>
        )}
      </main>

      <AskBar question={question} onAsk={setQuestion} busy={isFetching} />
    </Frame>
  );
}
