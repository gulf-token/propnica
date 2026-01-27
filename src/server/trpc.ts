import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// ===========================================
// Development Auth Bypass
// ===========================================
// When DEV_AUTH_BYPASS=true, we skip Supabase auth and use a mock user
// This allows local development without Supabase

const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === 'true';
const DEV_USER_ID = process.env.DEV_USER_ID ?? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEV_USER_EMAIL = process.env.DEV_USER_EMAIL ?? 'dev@propnica.local';

// Mock session for development
const createDevSession = () => ({
  user: {
    id: DEV_USER_ID,
    email: DEV_USER_EMAIL,
    app_metadata: {},
    user_metadata: { name: 'Dev User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  access_token: 'dev-access-token',
  refresh_token: 'dev-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
});

// ===========================================
// Context Creation
// ===========================================

export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Development auth bypass - skip Supabase entirely
  if (DEV_AUTH_BYPASS) {
    console.log('[tRPC Context] DEV_AUTH_BYPASS enabled - using mock user');
    const devSession = createDevSession();
    return {
      session: devSession,
      userId: DEV_USER_ID,
      prisma,
      supabase: null, // No Supabase client in dev bypass mode
      headers: opts.headers,
    };
  }

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
    console.log('[tRPC isAuthed] No session or userId - UNAUTHORIZED');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  console.log(`[tRPC isAuthed] Checking profile for user ${ctx.userId}`);

  try {
    // Ensure user profile exists in the database (sync Supabase Auth with Prisma)
    const existingProfile = await ctx.prisma.userProfile.findUnique({
      where: { userId: ctx.userId },
    });

    if (!existingProfile) {
      // Create user profile on first access
      console.log(`[tRPC isAuthed] Creating new profile for user ${ctx.userId}`);
      await ctx.prisma.userProfile.create({
        data: {
          userId: ctx.userId,
          displayName: ctx.session.user.email?.split('@')[0] ?? null,
          preferences: {},
        },
      });
      console.log(`[tRPC isAuthed] Created UserProfile for user ${ctx.userId}`);
    } else {
      console.log(`[tRPC isAuthed] Found existing profile for user ${ctx.userId}`);
    }
  } catch (error) {
    console.error('[tRPC isAuthed] Database error:', error instanceof Error ? error.message : error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database connection error',
      cause: error,
    });
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
