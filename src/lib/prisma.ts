import { PrismaClient } from '@prisma/client';

// ===========================================
// Prisma Client Singleton
// ===========================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get DATABASE_URL from environment
// In Amplify WEB_COMPUTE, env vars may not be available at module load time
// so we need to handle this gracefully
const databaseUrl = process.env.DATABASE_URL;
console.log('[Prisma] DATABASE_URL is set:', !!databaseUrl);
console.log('[Prisma] DATABASE_URL length:', databaseUrl?.length ?? 0);
if (databaseUrl) {
  // Log just the host portion for debugging without exposing credentials
  try {
    const url = new URL(databaseUrl);
    console.log('[Prisma] Database host:', url.hostname);
  } catch {
    console.log('[Prisma] Could not parse DATABASE_URL');
  }
} else {
  console.log('[Prisma] WARNING: DATABASE_URL is not set!');
  console.log('[Prisma] Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('PRISMA')).join(', '));
}

// Create Prisma client with explicit datasource URL override
// This works around the schema.prisma env() validation issue
const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[Prisma] FATAL: Cannot create PrismaClient without DATABASE_URL');
    // Return a client that will fail on first use rather than at import time
    // This gives better error messages
  }

  return new PrismaClient({
    log: ['error', 'warn'],
    // Override the datasource URL programmatically
    // This bypasses the schema.prisma env() validation
    datasources: url ? {
      db: {
        url: url,
      },
    } : undefined,
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache client in globalThis to reuse across Lambda invocations
// This is needed in BOTH development (for hot module reloading) AND production (for serverless)
globalForPrisma.prisma = prisma;

export default prisma;
