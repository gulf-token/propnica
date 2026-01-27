/**
 * Debug endpoint to check environment variable availability.
 * This should be removed after debugging.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in non-production or with debug header
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length ?? 0,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) ?? 'not-set',
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    awsRegion: process.env.AWS_REGION ?? 'not-set',
  };

  return NextResponse.json(envVars);
}
