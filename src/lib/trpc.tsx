'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@/server/router';

// ===========================================
// tRPC React Client
// ===========================================

export const trpc = createTRPCReact<AppRouter>();

// ===========================================
// Get Base URL
// ===========================================

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  
  // SSR should use vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Dev SSR should use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// ===========================================
// tRPC Provider Component
// ===========================================

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error && typeof error === 'object' && 'data' in error) {
                const trpcError = error as { data?: { httpStatus?: number } };
                if (trpcError.data?.httpStatus && trpcError.data.httpStatus >= 400 && trpcError.data.httpStatus < 500) {
                  return false;
                }
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            return {
              'x-trpc-source': 'react',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

// ===========================================
// Helper Hooks
// ===========================================

export { useQueryClient } from '@tanstack/react-query';
