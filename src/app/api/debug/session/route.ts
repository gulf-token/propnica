/**
 * Debug endpoint to check authenticated session and database access
 * Remove this after debugging!
 */

// Force dynamic rendering to allow cookies() usage
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // Check cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(
      (c) => c.name.includes('supabase') || c.name.includes('auth') || c.name.startsWith('sb-')
    );
    results.cookies = {
      total: allCookies.length,
      authCookieNames: authCookies.map((c) => c.name),
    };

    // Check env vars
    results.env = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
    };

    // Create Supabase client
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    results.supabaseClient = 'created';

    // Get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      results.session = { error: sessionError.message };
    } else {
      results.session = {
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id ?? null,
        email: sessionData.session?.user?.email ?? null,
        expiresAt: sessionData.session?.expires_at ?? null,
      };

      // If we have a session, try to access the database
      if (sessionData.session?.user?.id) {
        try {
          // Try to find or create user profile
          const existingProfile = await prisma.userProfile.findUnique({
            where: { userId: sessionData.session.user.id },
          });

          if (existingProfile) {
            results.database = {
              status: 'connected',
              userProfileExists: true,
              profileId: existingProfile.id,
            };
          } else {
            // Try to create profile
            const newProfile = await prisma.userProfile.create({
              data: {
                userId: sessionData.session.user.id,
                displayName: sessionData.session.user.email?.split('@')[0] ?? null,
                preferences: {},
              },
            });
            results.database = {
              status: 'connected',
              userProfileExists: false,
              createdProfile: true,
              profileId: newProfile.id,
            };
          }
        } catch (dbError) {
          results.database = {
            status: 'error',
            error: dbError instanceof Error ? dbError.message : String(dbError),
          };
        }
      }
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results);
}
