import { NextResponse } from "next/server";
import { getRepositoryMode, isDemoModeEnabled } from "@/lib/data";

export async function GET() {
  const mode = getRepositoryMode();
  return NextResponse.json({
    ok: mode !== "misconfigured",
    mode,
    demoMode: isDemoModeEnabled(),
    timestamp: new Date().toISOString(),
  });
}
