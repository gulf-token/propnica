import { PrismaClient } from '@prisma/client';

// ===========================================
// Prisma Client Singleton
// ===========================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Log DATABASE_URL status (not the actual value for security)
const databaseUrl = process.env.DATABASE_URL;
console.log('[Prisma] DATABASE_URL is set:', !!databaseUrl);
if (databaseUrl) {
  // Log just the host portion for debugging without exposing credentials
  try {
    const url = new URL(databaseUrl);
    console.log('[Prisma] Database host:', url.hostname);
  } catch {
    console.log('[Prisma] Could not parse DATABASE_URL');
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// Cache client in globalThis to reuse across Lambda invocations
// This is needed in BOTH development (for hot module reloading) AND production (for serverless)
globalForPrisma.prisma = prisma;

export default prisma;
