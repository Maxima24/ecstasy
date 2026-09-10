'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { getQueryClient } from './client';

/**
 * Wraps the app in a QueryClient.
 *
 * `getQueryClient()` is called during render rather than in a `useState`
 * initialiser because it already handles the server/browser split: a fresh
 * client per server request, a stable singleton in the browser.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Excluded from production bundles by the package itself. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
