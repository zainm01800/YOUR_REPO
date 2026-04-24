import { AlertTriangle } from "lucide-react";

interface TaxCalc {
  incomeTax: number;
  class4Ni: number;
  class2Ni: number;
  totalTax: number;
  effectiveRate: number;
  setAsidePercentage: number;
  taxableIncome: number;
}

interface UkTax {
  personalAllowance: number;
  basicRateLimit: number;
  higherRateLimit: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  ni4Lower: number;
  ni4Upper: number;
  ni4LowerRate: number;
  ni4UpperRate: number;
  ni2Annual: number;
}

interface Props {
  currency: string;
  grossIncome: number;
  vatCollected: number;
  netIncome: number;
  totalExpenses: number;
  profit: number;
  taxCalc: TaxCalc;
  taxYear: number;
  ukTax: UkTax;
}

function pct(val: number, total: number) {
  if (total <= 0) return 0;
  return Math.round(Math.min((val / total) * 100, 100));
}

export function TaxEstimatePanel({
  currency,
  grossIncome,
  vatCollected,
  netIncome,
  totalExpenses,
  profit,
  taxCalc,
  taxYear,
  ukTax,
}: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  const fmtInt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const paymentOnAccount = taxCalc.totalTax / 2;
  const jan31Deadline = `31 January ${taxYear + 2}`;
  const keepAmount = profit - taxCalc.totalTax;

  const bars = [
    { label: "Income Tax", value: taxCalc.incomeTax, color: "bg-[var(--color-accent)]" },
    { label: "Class 4 NI", value: taxCalc.class4Ni, color: "bg-amber-400" },
    { label: "Class 2 NI", value: taxCalc.class2Ni, color: "bg-emerald-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          This is an <strong>estimate only</strong> based on transactions in your workspace. It does not account for
          other income, allowances, pension contributions, or personal circumstances. Always consult a qualified
          accountant before filing.
        </p>
      </div>

      {/* Hero — large centered total */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Estimated tax due
        </p>
        <p className="mt-3 text-5xl font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
          {fmt(taxCalc.totalTax)}
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          due by {jan31Deadline}
        </p>

        {/* Breakdown bars */}
        <div className="mt-8 space-y-3 text-left">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">{bar.label}</span>
                <span className="font-semibold tabular-nums text-[var(--color-foreground)]">{fmt(bar.value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className={`h-full rounded-full transition-all ${bar.color}`}
                  style={{ width: `${pct(bar.value, taxCalc.totalTax)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Key figure chips */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Taxable Profit", value: fmtInt(profit) },
            { label: "Personal Allowance", value: fmtInt(ukTax.personalAllowance) },
            { label: "Effective Rate", value: `${taxCalc.effectiveRate.toFixed(1)}%` },
          ].map((chip) => (
            <div
              key={chip.label}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                {chip.label}
              </p>
              <p className="mt-1 text-base font-bold tabular-nums text-[var(--color-foreground)]">{chip.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* P&L bridge */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">
          Profit & Loss — {taxYear}/{taxYear + 1}
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Gross income (including VAT)", value: fmt(grossIncome), muted: false },
            { label: "VAT collected (not your income)", value: `− ${fmt(vatCollected)}`, muted: true },
            { label: "Net income (VAT exclusive)", value: fmt(netIncome), bold: true },
            { label: "Business expenses", value: `− ${fmt(totalExpenses)}`, muted: true },
          ].map((r) => (
            <div
              key={r.label}
              className={`flex items-center justify-between ${r.muted ? "text-[var(--color-muted-foreground)]" : ""}`}
            >
              <span>{r.label}</span>
              <span className={`tabular-nums ${r.bold ? "font-bold" : ""}`}>{r.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 font-bold">
            <span>Taxable profit</span>
            <span className="tabular-nums text-lg">{fmtInt(profit)}</span>
          </div>
        </div>
      </div>

      {/* Set-aside calculator */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-foreground)]">Set-aside calculator</h2>
        <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
          Put aside <strong>{taxCalc.setAsidePercentage}%</strong> of every payment to cover your tax bill.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Next Payment
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums text-[var(--color-foreground)]">
              {fmtInt(paymentOnAccount)}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">{jan31Deadline}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">
              Set Aside
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums text-amber-700">
              {fmtInt(taxCalc.totalTax)}
            </p>
            <p className="mt-0.5 text-[10px] text-amber-600">total tax estimate</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
              You&apos;ll Keep
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums text-emerald-700">
              {keepAmount > 0 ? fmtInt(keepAmount) : fmtInt(0)}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-600">after tax</p>
          </div>
        </div>
      </div>
    </div>
  );
}
