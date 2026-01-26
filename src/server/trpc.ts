import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// ===========================================
// Context Creation
// ===========================================

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const cookieStore = cookies();

  // Debug: Log auth cookies
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter(
    (c) => c.name.includes('supabase') || c.name.includes('auth') || c.name.startsWith('sb-')
  );
  console.log('[tRPC Context] Auth cookies:', authCookies.map((c) => c.name));

  // Use auth-helpers-nextjs which properly handles cookie parsing
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Get session (this properly reads from cookies)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log('[tRPC Context] Session:', session?.user?.id ? `found (user: ${session.user.id})` : 'null');

  return {
    session,
    userId: session?.user?.id ?? null,
    prisma,
    supabase,
    headers: opts.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// ===========================================
// tRPC Initialisation
// ===========================================

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ===========================================
// Middleware
// ===========================================

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  // Ensure user profile exists in the database (sync Supabase Auth with Prisma)
  const existingProfile = await ctx.prisma.userProfile.findUnique({
    where: { userId: ctx.userId },
  });

  if (!existingProfile) {
    // Create user profile on first access
    await ctx.prisma.userProfile.create({
      data: {
        userId: ctx.userId,
        displayName: ctx.session.user.email?.split('@')[0] ?? null,
        preferences: {},
      },
    });
    console.log(`[tRPC] Created UserProfile for user ${ctx.userId}`);
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} - ${durationMs}ms`);
  }
  
  return result;
});

// ===========================================
// Exports
// ===========================================

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Public procedure - no auth required
export const publicProcedure = t.procedure.use(loggerMiddleware);

// Protected procedure - auth required
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed);
