/**
 * Debug endpoint to check environment variables at runtime
 * Remove this after debugging!
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL_SET: !!databaseUrl,
      DATABASE_URL_LENGTH: databaseUrl?.length ?? 0,
      DATABASE_URL_HOST: databaseUrl ? (() => {
        try {
          return new URL(databaseUrl).hostname;
        } catch {
          return 'INVALID_URL';
        }
      })() : 'NOT_SET',
      ANTHROPIC_API_KEY_SET: !!anthropicKey,
      ANTHROPIC_API_KEY_PREFIX: anthropicKey?.slice(0, 10) ?? 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY_SET: !!supabaseServiceKey,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  });
}
