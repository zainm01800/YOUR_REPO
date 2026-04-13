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
      // Try to fetch a workspace to verify schema health (specifically the slug column)
      const workspace = await repository.getWorkspace();
      health.database = {
        connected: true,
        workspaceFound: !!workspace,
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
