/**
 * Debug endpoint to check Supabase auth configuration
 * Remove this after debugging!
 */

// Force dynamic rendering to allow cookies() usage
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // Check environment variables
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...',
  };

  // Check cookies
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(
      (c) => c.name.includes('supabase') || c.name.includes('auth') || c.name.startsWith('sb-')
    );
    results.cookies = {
      total: allCookies.length,
      authCookieNames: authCookies.map((c) => c.name),
    };
  } catch (error) {
    results.cookies = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Try to create Supabase client
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    results.supabaseClient = 'created successfully';

    // Try to get session
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        results.session = {
          error: error.message,
          status: error.status,
        };
      } else {
        results.session = {
          hasSession: !!data.session,
          userId: data.session?.user?.id ?? null,
          userEmail: data.session?.user?.email ?? null,
          expiresAt: data.session?.expires_at ?? null,
        };
      }
    } catch (sessionError) {
      results.session = {
        error: sessionError instanceof Error ? sessionError.message : String(sessionError),
      };
    }
  } catch (clientError) {
    results.supabaseClient = {
      error: clientError instanceof Error ? clientError.message : String(clientError),
    };
  }

  return NextResponse.json(results);
}
