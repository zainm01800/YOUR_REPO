import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { syncLiveVatRules } from "@/lib/vat/live-sync";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

async function runSync() {
  const repository = getRepository();
  const syncResult = await syncLiveVatRules();
  const vatRules = await repository.upsertVatRules({ rules: syncResult.rules });

  return NextResponse.json({
    syncedAt: syncResult.syncedAt,
    countries: syncResult.countries,
    sourceSummary: syncResult.sourceSummary,
    syncedRuleCount: syncResult.rules.length,
    totalRuleCount: vatRules.length,
  });
}

export async function POST() {
  return runSync();
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runSync();
}
