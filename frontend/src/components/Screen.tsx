'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { BlockRenderer } from '@/blocks/BlockRenderer';
import { submitAnswer } from '@/lib/api';
import { applyInvariants } from '@/lib/invariants';
import { useProfile } from '@/lib/profile/context';
import {
  askQueryOptions,
  invalidateAfterAnswer,
  prefetchAllProfiles,
} from '@/lib/query/keys';

import { AskBar, Frame, Header } from './chrome/Chrome';
import { ScreenSkeleton } from './ScreenSkeleton';

const DEMO_QUESTION = 'If 3x + 5 = 20, what is x?';

/**
 * The one screen. Its contents change.
 *
 * Chrome is fixed and hand-built; only the middle region is generated. The
 * profile flip is the single orchestrated moment — content fades out over
 * --dur-flip-out, then the incoming blocks rise 8px into place over
 * --dur-flip-in. Nothing else animates.
 */
export function Screen({ question = DEMO_QUESTION }: { question?: string }) {
  const { profile, phase } = useProfile();
  const queryClient = useQueryClient();
  const warmed = useRef(false);

  const { data, isPending, isError, error, refetch } = useQuery(
    askQueryOptions(question, profile),
  );

  /*
   * Warm the other three profiles once the first answer lands.
   *
   * This is what makes the proxy affordable: the extra hop is paid here, on
   * initial load where the budget is 2500 ms, instead of on the flip where it
   * is 150 ms. After this resolves every flip is a cache read.
   *
   * Not setState, so no cascading render — this only fills the query cache.
   */
  useEffect(() => {
    if (!data || warmed.current) return;
    warmed.current = true;
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
      // reorder moment meaningless.
      invalidateAfterAnswer(queryClient, result.roadmap_changed);
    } catch {
      // The learner already saw their result — grading was local. Failing to
      // record it must not disturb the screen.
    }
  }

  // Invariants run after parsing, before render. The model chooses within the
  // constraint; this guarantees the shape.
  const blocks = data ? applyInvariants(profile, data.blocks) : [];

  const transition =
    phase === 'out'
      ? 'opacity-0 -translate-y-1 duration-flip-out ease-expressive-out'
      : phase === 'in'
        ? 'opacity-100 translate-y-0 duration-flip-in ease-expressive-in'
        : 'opacity-100 translate-y-0 duration-flip-in ease-expressive-in';

  return (
    <Frame>
      <Header streak={4} />

      <main className="flex-1 px-s3 py-s4">
        {isPending ? (
          <ScreenSkeleton />
        ) : isError ? (
          <div className="flex flex-col gap-s2">
            <p className="text-body text-ink max-w-(--measure)">
              {error instanceof Error ? error.message : 'The answer could not be loaded.'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-quiet text-accent text-left"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className={`transition-[opacity,transform] ${transition}`}>
            <BlockRenderer blocks={blocks} onQuizAnswered={handleAnswered} />
          </div>
        )}
      </main>

      <AskBar question={question} />
    </Frame>
  );
}
