import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

function buildDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // Required for PgBouncer (Supabase pooler) — disables prepared statements
    url.searchParams.set("pgbouncer", "true");
    // Recommended for serverless — limits connections per function instance
    url.searchParams.set("connection_limit", "1");
    return url.toString();
  } catch {
    return raw;
  }
}

export function getPrismaClient() {
  if (process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL) {
    return null;
  }

  if (!global.__prisma__) {
    const url = buildDatabaseUrl(process.env.DATABASE_URL);
    global.__prisma__ = new PrismaClient({
      datasources: { db: { url } },
    });
  }

  return global.__prisma__;
}
