import type { QueryClient } from '@tanstack/react-query';

import { ask, DEMO_USER_ID } from '../api';
import { PROFILES, type Profile } from '../types';

/**
 * Query keys and cache policy.
 *
 * All caching lives in the browser, where it is scoped to one person by
 * construction. The proxy caches nothing (R2) — `roadmap` and `progress_panel`
 * arrive filled per user, so a cached proxy response served to a second user
 * would be a cross-user data leak.
 */

export const keys = {
  ask: (question: string, profile: Profile) => ['ask', question, profile] as const,
  roadmap: (userId: string = DEMO_USER_ID) => ['roadmap', userId] as const,
  progress: (userId: string = DEMO_USER_ID) => ['progress', userId] as const,
};

/**
 * A spec for a given question and profile does not change within a session,
 * and §3.9 pre-warms the demo keys. Refetching one would trade the demo's best
 * moment for nothing.
 *
 * Set per-key rather than globally, so future queries do not silently inherit
 * `Infinity`.
 */
export const ASK_STALE_TIME = Infinity;

export function askQueryOptions(question: string, profile: Profile) {
  return {
    queryKey: keys.ask(question, profile),
    queryFn: () => ask(question, profile),
    staleTime: ASK_STALE_TIME,
  };
}

/**
 * Warm every profile for a question.
 *
 * This is what makes the proxy affordable. The extra network hop lands on
 * initial load, where the budget is 2500 ms, instead of on the profile flip,
 * where it is 150 ms. After this resolves, every flip is a cache read at zero
 * network latency.
 *
 * Failures are deliberately swallowed: a profile the learner may never select
 * must not surface an error. If they do select it, the query runs again and
 * reports the failure then.
 */
export function prefetchAllProfiles(
  client: QueryClient,
  question: string,
  except?: Profile,
): void {
  for (const profile of PROFILES) {
    if (profile === except) continue;
    void client.prefetchQuery(askQueryOptions(question, profile)).catch(() => {});
  }
}

/**
 * Invalidate the queries a graded answer affects.
 *
 * Call this ONLY when `/quiz/submit` returned `roadmap_changed: true`. The flag
 * exists so the frontend does not refetch on every answer — an unconditional
 * invalidate would make the reorder moment meaningless.
 */
export function invalidateAfterAnswer(
  client: QueryClient,
  roadmapChanged: boolean,
): void {
  if (!roadmapChanged) return;
  void client.invalidateQueries({ queryKey: keys.roadmap() });
  void client.invalidateQueries({ queryKey: keys.progress() });
}
