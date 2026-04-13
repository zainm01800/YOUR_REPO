"use client";

import { useState, useTransition } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const SHEET_LIST = [
  { name: "Summary", color: "bg-[var(--color-accent)]", description: "Workspace, period, and key financial KPIs at a glance." },
  { name: "Profit & Loss", color: "bg-emerald-600", description: "Income and expenses by category and bucket, with net profit." },
  { name: "Tax Summary", color: "bg-amber-600", description: "Accounting profit, tax adjustments, taxable profit, and estimated tax." },
  { name: "Transactions", color: "bg-blue-700", description: "Full transaction detail with claimability, GL codes, and VAT breakdown." },
  { name: "Reconciliation", color: "bg-violet-600", description: "Document-to-bank matches, differences, and comparison status." },
  { name: "Needs Review", color: "bg-orange-600", description: "Uncategorised items, mismatches, and low-confidence entries." },
  { name: "VAT Summary", color: "bg-teal-600", description: "Output VAT, input VAT, and net VAT position by category." },
  { name: "Balance Sheet", color: "bg-gray-700", description: "Assets, liabilities, and equity movements summary." },
];

export function PeriodExportPack({
  periodOptions,
  workspaceName,
  currency,
  vatRegistered,
}: {
  periodOptions: string[];
  workspaceName: string;
  currency: string;
  vatRegistered: boolean;
}) {
  const [period, setPeriod] = useState<string>(periodOptions[0] ?? "all");
  const [includeDraft, setIncludeDraft] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [, startTransition] = useTransition();

  function formatPeriodLabel(p: string) {
    if (p === "all") return "All periods";
    // Try to format YYYY-MM as "April 2025"
    const match = /^(\d{4})-(\d{2})$/.exec(p);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
      return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }
    return p;
  }

  function handleDownload() {
    setStatus("generating");
    setErrorMsg("");

    startTransition(async () => {
      try {
        const params = new URLSearchParams({ period, includeDraft: String(includeDraft) });
        const response = await fetch(`/api/export/period-pack?${params.toString()}`);

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Server returned ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const periodLabel = period === "all" ? "all-periods" : period;
        const draftLabel = includeDraft ? "-with-drafts" : "-confirmed";
        anchor.href = url;
        anchor.download = `period-pack-${periodLabel}${draftLabel}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);

        setStatus("done");
        setTimeout(() => setStatus("idle"), 4000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Config panel */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]">
              <FileSpreadsheet className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Configure your export
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {workspaceName} · {currency}
                {vatRegistered ? " · VAT registered" : ""}
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="all">All periods (everything)</option>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)} ({p})
                </option>
              ))}
            </select>
            {periodOptions.length === 0 && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                No period-tagged runs found. Runs must have a period set to filter by month.
                Selecting "All periods" will include all data.
              </p>
            )}
          </div>

          {/* Draft mode */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Data mode
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIncludeDraft(false)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  !includeDraft
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "border-[var(--color-border)] bg-white hover:bg-[var(--color-panel)]"
                }`}
              >
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${!includeDraft ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`} />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">Confirmed only</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    Completed and exported runs only. Cleanest data for accountants.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIncludeDraft(true)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  includeDraft
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "border-[var(--color-border)] bg-white hover:bg-[var(--color-panel)]"
                }`}
              >
                <Archive className={`mt-0.5 h-4 w-4 shrink-0 ${includeDraft ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`} />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">Include drafts</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    Includes review-required and draft items. Good for interim reviews.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Download button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={status === "generating"}
              className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-[var(--color-accent)] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating workbook…
                </>
              ) : status === "done" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Period Pack
                </>
              )}
            </button>

            {status === "done" && (
              <p className="text-sm text-emerald-600 font-medium">
                ✓ {formatPeriodLabel(period)} workbook ready
              </p>
            )}

            {status === "error" && (
              <p className="text-sm text-red-600">
                Error: {errorMsg}
              </p>
            )}
          </div>

          {/* What's included */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-foreground)]">
              <Info className="h-3.5 w-3.5" />
              Workbook contents
            </div>
            <p className="mt-1">
              8 sheets · Excel (.xlsx) · Optimised for accountants and self-assessment preparation.
              {!vatRegistered && " VAT sheet included but will note that VAT is not enabled."}
            </p>
          </div>
        </Card>

        {/* Sheet preview list */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Sheets included
          </p>
          {SHEET_LIST.map((sheet, i) => (
            <div
              key={sheet.name}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-sm"
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${sheet.color}`}>
                <span className="text-[10px] font-bold text-white">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">{sheet.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-4">{sheet.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Help card */}
      <Card className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">About Period Export Packs</h3>
        <div className="grid gap-3 text-xs text-[var(--color-muted-foreground)] sm:grid-cols-3">
          <p>
            <strong className="text-[var(--color-foreground)]">For accountants:</strong> Export confirmed data to give to your accountant at month-end or year-end. The Tax Summary sheet shows accounting profit vs taxable profit clearly.
          </p>
          <p>
            <strong className="text-[var(--color-foreground)]">For record keeping:</strong> Keep a monthly workbook as an offline backup of all financial activity. Each export is a snapshot of data at the time of download.
          </p>
          <p>
            <strong className="text-[var(--color-foreground)]">For self-assessment:</strong> The Tax Summary sheet breaks down claimable vs non-claimable expenses, making it easier to prepare your self-assessment return.
          </p>
        </div>
      </Card>
    </div>
  );
}
