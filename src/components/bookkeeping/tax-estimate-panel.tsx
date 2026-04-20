import { AlertTriangle, Info } from "lucide-react";

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
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const pct = (n: number) => `${n.toFixed(1)}%`;

  const paymentOnAccount = taxCalc.totalTax / 2;
  const jan31Deadline = `31 January ${taxYear + 2}`;
  const jul31Deadline = `31 July ${taxYear + 2}`;

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This is an <strong>estimate only</strong> based on transactions in your workspace. It does not account for
          other income, allowances, pension contributions, or personal circumstances. Always consult a qualified
          accountant before filing.
        </p>
      </div>

      {/* P&L summary */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="mb-4 text-base font-semibold">Profit & Loss — {taxYear}/{taxYear + 1}</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: "Gross income (including VAT)", value: fmt(grossIncome), muted: false },
            { label: "VAT collected (not your income)", value: `− ${fmt(vatCollected)}`, muted: true },
            { label: "Net income (VAT exclusive)", value: fmt(netIncome), bold: true },
            { label: "Business expenses", value: `− ${fmt(totalExpenses)}`, muted: true },
          ].map((r) => (
            <div key={r.label} className={`flex items-center justify-between ${r.muted ? "text-[var(--color-muted-foreground)]" : ""}`}>
              <span>{r.label}</span>
              <span className={`tabular-nums ${r.bold ? "font-bold" : ""}`}>{r.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-bold text-base">
            <span>Taxable profit</span>
            <span className="tabular-nums text-lg">{fmt(profit)}</span>
          </div>
        </div>
      </div>

      {/* Tax calculation */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="mb-4 text-base font-semibold">Tax calculation</h2>

        {/* Tax bands info */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {[
            { label: `Up to ${fmt(ukTax.personalAllowance)}`, note: "Personal allowance — 0%" },
            { label: `${fmt(ukTax.personalAllowance)} – ${fmt(ukTax.basicRateLimit)}`, note: `Basic rate — ${ukTax.basicRate * 100}%` },
            { label: `${fmt(ukTax.basicRateLimit)} – ${fmt(ukTax.higherRateLimit)}`, note: `Higher rate — ${ukTax.higherRate * 100}%` },
          ].map((band) => (
            <div key={band.label} className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5">
              <span className="font-medium">{band.label}</span>
              <span className="ml-1.5 text-[var(--color-muted-foreground)]">{band.note}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          {[
            { label: "Taxable income (after personal allowance)", value: fmt(taxCalc.taxableIncome), muted: true },
            { label: "Income tax", value: fmt(taxCalc.incomeTax) },
            { label: `Class 4 NI (${ukTax.ni4LowerRate * 100}% / ${ukTax.ni4UpperRate * 100}%)`, value: fmt(taxCalc.class4Ni) },
            { label: "Class 2 NI (flat rate)", value: fmt(taxCalc.class2Ni) },
          ].map((r) => (
            <div key={r.label} className={`flex items-center justify-between ${r.muted ? "text-[var(--color-muted-foreground)]" : ""}`}>
              <span>{r.label}</span>
              <span className="tabular-nums">{r.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-bold text-base">
            <span>Estimated total tax</span>
            <span className="tabular-nums text-lg text-[var(--color-danger)]">{fmt(taxCalc.totalTax)}</span>
          </div>
          <div className="flex items-center justify-between text-[var(--color-muted-foreground)]">
            <span>Effective rate</span>
            <span className="tabular-nums">{pct(taxCalc.effectiveRate)}</span>
          </div>
        </div>
      </div>

      {/* Set aside advice */}
      <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">
              Set aside <strong>{taxCalc.setAsidePercentage}%</strong> of each invoice
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Based on your current profit, putting aside {taxCalc.setAsidePercentage}% of every payment you receive
              will build up roughly {fmt(taxCalc.totalTax)} in time for your tax bill.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Jan 31 {taxYear + 2}</p>
                <p className="mt-1 font-bold text-emerald-800">{fmt(taxCalc.totalTax + paymentOnAccount)}</p>
                <p className="text-xs text-emerald-600">Balancing payment + 1st payment on account</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Jul 31 {taxYear + 2}</p>
                <p className="mt-1 font-bold text-emerald-800">{fmt(paymentOnAccount)}</p>
                <p className="text-xs text-emerald-600">2nd payment on account</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
