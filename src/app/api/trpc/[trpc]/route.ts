import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/router';
import { createTRPCContext } from '@/server/trpc';

// Force dynamic rendering to allow cookies() usage
export const dynamic = 'force-dynamic';

// ===========================================
// tRPC Handler
// ===========================================

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      // Always log errors in both development and production
      console.error(
        `[tRPC Error] ${path ?? '<no-path>'}:`,
        error.message,
        error.cause instanceof Error ? `| Cause: ${error.cause.message}` : ''
      );
    },
  });

export { handler as GET, handler as POST };
