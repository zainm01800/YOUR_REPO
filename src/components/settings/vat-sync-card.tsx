"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SyncState =
  | { status: "idle" }
  | {
      status: "done";
      syncedAt: string;
      countries: string[];
      syncedRuleCount: number;
      totalRuleCount: number;
      sourceSummary: string[];
    }
  | { status: "error"; message: string };

type SyncResponsePayload = {
  syncedAt: string;
  countries: string[];
  syncedRuleCount: number;
  totalRuleCount: number;
  sourceSummary: string[];
};

export function VatSyncCard({ currentRuleCount }: { currentRuleCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });

  function handleSync() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/vat-rules/sync", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`VAT sync failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as SyncResponsePayload;
        setSyncState({ status: "done", ...payload });
        router.refresh();
      } catch (error) {
        setSyncState({
          status: "error",
          message: error instanceof Error ? error.message : "VAT sync failed.",
        });
      }
    });
  }

  return (
    <Card className="space-y-4 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Live VAT rate sync</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Pull the latest UK and EU VAT rates into your workspace rules. Zentra syncs
            UK rates from GOV.UK and EU rates from the European Commission TEDB service, then
            stores them in your own database for review and export logic.
          </p>
        </div>
        <Button type="button" onClick={handleSync} disabled={pending}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {pending ? "Syncing rates..." : "Sync live VAT rates"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-[var(--color-panel)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Current rules
          </div>
          <div className="mt-2 text-3xl font-semibold">{currentRuleCount}</div>
        </div>
        <div className="rounded-2xl bg-[var(--color-panel)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Coverage
          </div>
          <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            United Kingdom plus EU member state standard and reduced rates.
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--color-panel)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Schedule
          </div>
          <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Manual sync now, cron-ready for nightly refresh on Vercel.
          </div>
        </div>
      </div>

      {syncState.status === "done" ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-sm">
          <div className="font-semibold text-[var(--color-foreground)]">
            Synced {syncState.syncedRuleCount} rates across {syncState.countries.length} countries
          </div>
          <div className="mt-1 text-[var(--color-muted-foreground)]">
            Stored workspace rules: {syncState.totalRuleCount}. Last sync:{" "}
            {new Date(syncState.syncedAt).toLocaleString("en-GB")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {syncState.sourceSummary.map((line) => (
              <span
                key={line}
                className="rounded-lg bg-white px-2 py-1 text-xs text-[var(--color-muted-foreground)] shadow-sm"
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {syncState.status === "error" ? (
        <div className="rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">
          {syncState.message}
        </div>
      ) : null}
    </Card>
  );
}
