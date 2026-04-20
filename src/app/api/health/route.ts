import { NextResponse } from "next/server";
import { getRepositoryMode, isDemoModeEnabled } from "@/lib/data";
import { getPrismaClient } from "@/lib/data/prisma";

export async function GET() {
  const mode = getRepositoryMode();
  const timestamp = new Date().toISOString();

  // Quick DB connectivity probe (non-fatal)
  let dbStatus: "ok" | "error" | "skipped" = "skipped";
  if (mode === "prisma") {
    try {
      const prisma = getPrismaClient();
      if (prisma) {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = "ok";
      }
    } catch {
      dbStatus = "error";
    }
  }

  const ok = mode !== "misconfigured" && dbStatus !== "error";

  return NextResponse.json(
    {
      ok,
      mode,
      demoMode: isDemoModeEnabled(),
      db: dbStatus,
      timestamp,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
