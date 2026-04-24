"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  ReceiptText,
  Settings2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { VatReport, VatReportLine } from "@/lib/accounting/reports";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
};

function fmt(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${sym}${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── UK VAT Return box definitions ─────────────────────────────────────────────
// Only boxes 1, 4, 5, 6, 7 are relevant for standard-method sole traders.
// Boxes 2, 8, 9 are for EC acquisitions (almost always zero for UK-only).

function buildReturnBoxes(vatReport: VatReport, currency: string) {
  const netSales = vatReport.outputLines.reduce((s, l) => s + l.netAmount, 0);
  const netPurchases = vatReport.inputLines.reduce((s, l) => s + l.netAmount, 0);

  return [
    {
      box: "1",
      label: "VAT due on sales and other outputs",
      description: "Output VAT charged on your invoices and income.",
      value: vatReport.outputTax,
      formatted: fmt(vatReport.outputTax, currency),
      tone: "neutral" as const,
    },
    {
      box: "4",
      label: "VAT reclaimed on purchases and other inputs",
      description: "Input VAT you can reclaim on allowable business expenses.",
      value: vatReport.inputTaxRecoverable,
      formatted: fmt(vatReport.inputTaxRecoverable, currency),
      tone: "positive" as const,
    },
    {
      box: "5",
      label: "Net VAT to pay or reclaim",
      description:
        vatReport.netVatPosition >= 0
          ? "Amount payable to HMRC (Box 1 minus Box 4)."
          : "Amount reclaimable from HMRC (Box 4 minus Box 1).",
      value: vatReport.netVatPosition,
      formatted: fmt(vatReport.netVatPosition, currency),
      tone: vatReport.netVatPosition > 0 ? ("warning" as const) : ("positive" as const),
    },
    {
      box: "6",
      label: "Total value of sales, excluding VAT",
      description: "Net value of all your sales and other outputs.",
      value: netSales,
      formatted: fmt(netSales, currency),
      tone: "neutral" as const,
    },
    {
      box: "7",
      label: "Total value of purchases, excluding VAT",
      description: "Net value of all your purchases and other inputs.",
      value: netPurchases,
      formatted: fmt(netPurchases, currency),
      tone: "neutral" as const,
    },
  ];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReturnBox({
  box,
  label,
  description,
  formatted,
  tone,
}: {
  box: string;
  label: string;
  description: string;
  formatted: string;
  tone: "neutral" | "positive" | "warning";
}) {
  const valueClass =
    tone === "warning"
      ? "text-amber-700"
      : tone === "positive"
        ? "text-emerald-700"
        : "text-[var(--color-foreground)]";

  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-softer)] text-[11px] font-black text-[var(--accent-ink)]">
        {box}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.12em]">
          Box {box}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)] leading-snug">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      <div className={`shrink-0 font-mono text-xl font-bold ${valueClass}`}>{formatted}</div>
    </div>
  );
}

function BreakdownTable({
  title,
  lines,
  currency,
  emptyMessage,
  icon,
}: {
  title: string;
  lines: VatReportLine[];
  currency: string;
  emptyMessage: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  if (lines.length === 0) {
    return (
      <Card className="rounded-2xl border border-[var(--line)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-[10px] bg-[var(--accent-softer)] p-2 text-[var(--accent-ink)]">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-[var(--line)] p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-6 text-left transition-colors hover:bg-[var(--color-panel)]"
      >
        <div className="rounded-[10px] bg-[var(--accent-softer)] p-2 text-[var(--accent-ink)]">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {lines.length} categor{lines.length === 1 ? "y" : "ies"} ·{" "}
            {lines.reduce((s, l) => s + l.transactionCount, 0)} transactions
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--line)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-panel)]">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  VAT rate
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Txns
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Net
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  VAT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-[var(--color-panel)] transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-medium text-[var(--color-foreground)]">
                      {line.category}
                    </span>
                    {!line.vatRecoverable && (
                      <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Non-recoverable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-muted-foreground)]">
                    {line.vatRate > 0 ? `${line.vatRate}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--color-muted-foreground)]">
                    {line.transactionCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-foreground)]">
                    {fmt(line.netAmount, currency)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-semibold text-[var(--color-foreground)]">
                    {line.taxAmount > 0 ? fmt(line.taxAmount, currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[var(--color-foreground)] bg-[var(--color-panel)]">
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-3 text-sm font-bold text-[var(--color-foreground)]"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[var(--color-foreground)]">
                  {fmt(
                    lines.reduce((s, l) => s + l.netAmount, 0),
                    currency,
                  )}
                </td>
                <td className="px-6 py-3 text-right font-mono font-bold text-[var(--color-foreground)]">
                  {fmt(
                    lines.reduce((s, l) => s + l.taxAmount, 0),
                    currency,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function VatReconciliation({
  vatReport,
  periodOptions,
  selectedPeriod,
  currency,
  vatRegistered,
}: {
  vatReport: VatReport;
  periodOptions: string[];
  selectedPeriod?: string;
  currency: string;
  vatRegistered: boolean;
}) {
  const router = useRouter();

  // ── Not VAT registered ──────────────────────────────────────────────────────
  if (!vatRegistered) {
    return (
      <Card className="cm-panel p-10">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <ReceiptText className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">
            VAT registration not enabled
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
            This workspace is set to non-VAT registered, so no VAT position is being calculated.
            If you are VAT registered, enable it in Settings to see your return figures.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/settings?tab=tax"
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-strong)]"
            >
              <Settings2 className="h-4 w-4" />
              Go to Settings
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              You only need to register for VAT if your turnover exceeds the current threshold.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const boxes = buildReturnBoxes(vatReport, currency);
  const netVat = vatReport.netVatPosition;
  const hasTransactions =
    vatReport.outputLines.length > 0 || vatReport.inputLines.length > 0;

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Period:
          </label>
          <select
            className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={selectedPeriod ?? ""}
            onChange={(e) => {
              const p = e.target.value;
              const url = p ? `?period=${encodeURIComponent(p)}` : "?";
              router.push(url);
            }}
          >
            <option value="">All periods</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-foreground)] transition-all hover:bg-[var(--color-panel)]"
          onClick={() => {
            const rows: string[][] = [
              ["Type", "Category", "Reporting Bucket", "Tax Treatment", "VAT Rate %", "Transactions", "Net Amount", "VAT Amount", "VAT Recoverable"],
            ];
            for (const line of vatReport.outputLines) {
              rows.push([
                "Output (Sales)",
                line.category,
                line.reportingBucket,
                line.taxTreatment,
                String(Math.round(line.vatRate * 100)),
                String(line.transactionCount),
                line.netAmount.toFixed(2),
                line.taxAmount.toFixed(2),
                "Yes",
              ]);
            }
            for (const line of vatReport.inputLines) {
              rows.push([
                "Input (Purchases)",
                line.category,
                line.reportingBucket,
                line.taxTreatment,
                String(Math.round(line.vatRate * 100)),
                String(line.transactionCount),
                line.netAmount.toFixed(2),
                line.taxAmount.toFixed(2),
                line.vatRecoverable ? "Yes" : "No",
              ]);
            }
            rows.push(
              [],
              ["Summary"],
              ["Output VAT", "", "", "", "", "", "", vatReport.outputTax.toFixed(2), ""],
              ["Input VAT (Recoverable)", "", "", "", "", "", "", vatReport.inputTaxRecoverable.toFixed(2), ""],
              ["Input VAT (Non-Recoverable)", "", "", "", "", "", "", vatReport.inputTaxNonRecoverable.toFixed(2), ""],
              ["Net VAT Position (payable)", "", "", "", "", "", "", vatReport.netVatPosition.toFixed(2), ""],
            );
            const csv = rows.map(r => r.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vat-return${selectedPeriod ? `-${selectedPeriod}` : ""}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* No transactions warning */}
      {!hasTransactions && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm text-amber-700">No VAT-able transactions found for the selected period.</span>
        </div>
      )}

      {/* Two-column: return boxes (left) + submission panel (right) */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left — UK VAT Return boxes */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              VAT return figures
            </h2>
            <div className="group relative cursor-help" title="Based on your categorised transactions. Boxes 2, 8 and 9 (EU acquisitions) are omitted as they are not applicable for most UK sole traders.">
              <Info className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {boxes.map((b) => (
              <ReturnBox key={b.box} {...b} />
            ))}
          </div>
        </div>

        {/* Right — Submission summary panel */}
        <div className="space-y-4">
          {/* Net position highlight */}
          <Card
            className={`rounded-2xl p-5 ${
              netVat > 0
                ? "border-amber-200 bg-amber-50"
                : netVat < 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[var(--color-border)] bg-[var(--color-panel)]"
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${
              netVat > 0 ? "text-amber-700" : netVat < 0 ? "text-emerald-700" : "text-[var(--color-muted-foreground)]"
            }`}>
              {netVat > 0 ? "Amount payable" : netVat < 0 ? "Amount reclaimable" : "Net position"}
            </p>
            <p className={`mt-1 text-3xl font-black tabular-nums ${
              netVat > 0 ? "text-amber-800" : netVat < 0 ? "text-emerald-800" : "text-[var(--color-foreground)]"
            }`}>
              {fmt(netVat, currency)}
            </p>
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              {netVat > 0
                ? "Due to HMRC at next filing deadline"
                : netVat < 0
                  ? "Reclaimable from HMRC on your next return"
                  : "Your VAT is balanced - nothing owed or reclaimable"}
            </p>
          </Card>

          {/* Filing deadlines */}
          <Card className="cm-panel-subtle p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Filing notes
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-[var(--color-muted-foreground)]">
                  Review figures with your accountant before filing
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-[var(--color-muted-foreground)]">
                  File via HMRC VAT online account or MTD-compatible software
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <p className="text-[var(--color-muted-foreground)]">
                  EC boxes (2, 8, 9) omitted — not applicable for most UK businesses
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction breakdowns */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">
          Transaction breakdown
        </h2>

        <BreakdownTable
          title="Output VAT — sales and income"
          lines={vatReport.outputLines}
          currency={currency}
          emptyMessage="No VAT-able income transactions found for this period."
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <BreakdownTable
          title="Input VAT — purchases and expenses"
          lines={vatReport.inputLines}
          currency={currency}
          emptyMessage="No VAT-able expense transactions found for this period."
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
