import { NextResponse } from "next/server";
import { getRepository, getRepositoryMode, isDemoModeEnabled } from "@/lib/data";

export async function GET() {
  const mode = getRepositoryMode();
  const health: any = {
    ok: mode !== "misconfigured",
    mode,
    demoMode: isDemoModeEnabled(),
    timestamp: new Date().toISOString(),
  };

  if (mode === "prisma") {
    try {
      const repository = getRepository();
      
      // Rigorous check: specifically query CategoryRule to test for the 'slug' column
      // If the column is missing, this will throw P2022
      const rules = await repository.getCategoryRules();

      health.database = {
        connected: true,
        schemaHealthy: true,
        categoryCount: rules.length,
      };
    } catch (error: any) {
      health.ok = false;
      health.database = {
        connected: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  return NextResponse.json(health);
}
