import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query';

/**
 * QueryClient construction, SSR-safe.
 *
 * The server gets a fresh client per request — a shared one would leak one
 * user's cached data into another user's render. The browser keeps a single
 * client for the tab's lifetime.
 *
 * NOTE: the timings below are provisional. They are tuned to the app's shape
 * (how personalised the data is, how fast it changes), which is still being
 * decided. Revisit them alongside the caching strategy rather than treating
 * them as settled.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that navigating back to a screen does not refetch
        // immediately; short enough that data does not feel frozen.
        staleTime: 30_000,
        gcTime: 5 * 60_000,

        // The proxy already returns safe, final errors. Retrying a 4xx just
        // repeats a rejection, so only retry what might be transient.
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },

        refetchOnWindowFocus: false,
      },
      dehydrate: {
        // Include pending queries so streamed server work can hydrate on the
        // client without a second fetch.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // A new client per request. Never share across requests.
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
