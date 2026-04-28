"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  Building2, 
  CreditCard, 
  ChevronRight, 
  Download, 
  Search, 
  AlertTriangle,
  FileSpreadsheet,
  Info,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type {
  BalanceSheetReport,
  PnLReport,
  ReportBucket,
  UncategorisedTransaction,
  VatReport,
} from "@/lib/accounting/reports";
import type { Workspace } from "@/lib/domain/types";
import { TAX_TREATMENT_LABELS } from "@/lib/accounting/classifier";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF ",
};

const STATEMENT_COMPARATIVE_HEADERS = [
  "Current period",
] as const;

type Tab = "pnl" | "balance" | "vat" | "uncategorised";

function formatAmount(amount: number, currency: string) {
  const prefix = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${prefix}${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyComparatives() {
  return Array.from({ length: STATEMENT_COMPARATIVE_HEADERS.length - 1 }, () => "\u2014");
}

function StatementCover({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <div className="rounded-t-2xl bg-[var(--accent)] px-8 py-7 text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold">ClearMatch</p>
          <h2 className="mt-2 text-3xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-[color:rgba(246,247,243,0.92)]">{subtitle}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:rgba(246,247,243,0.72)]">{meta}</p>
        </div>
        <p className="max-w-sm text-right text-xs leading-5 text-[color:rgba(246,247,243,0.84)]">
          Management-format statement built from categorised bookkeeping data.
        </p>
      </div>
    </div>
  );
}

function FormalStatementShell({
  title,
  subtitle,
  meta,
  children,
  footnote,
}: {
  title: string;
  subtitle: string;
  meta: string;
  children: React.ReactNode;
  footnote?: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <StatementCover title={title} subtitle={subtitle} meta={meta} />
      <div className="px-6 py-6 md:px-8">
        {children}
        {footnote ? (
          <div className="mt-6 rounded-2xl bg-[var(--color-panel)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
            {footnote}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function StatementTableHeader({
  columns,
}: {
  columns: string[];
}) {
  return (
    <thead>
      <tr className="border-b-2 border-[var(--color-foreground)]">
        <th className="w-[40%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
          Description
        </th>
        {columns.map((column) => (
          <th
            key={column}
            className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function StatementGroupLabel({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={1 + STATEMENT_COMPARATIVE_HEADERS.length}
        className="bg-[var(--color-panel)] px-3 py-2 text-sm font-bold text-[var(--color-foreground)]"
      >
        {label}
      </td>
    </tr>
  );
}

function StatementValueRow({
  label,
  current,
  emphasis = "normal",
  indent = 0,
  tooltip,
}: {
  label: string;
  current: string;
  emphasis?: "normal" | "subtotal" | "total";
  indent?: number;
  tooltip?: string;
}) {
  const rowClass =
    emphasis === "total"
      ? "border-t-2 border-b-2 border-[var(--color-foreground)] font-bold"
      : emphasis === "subtotal"
        ? "border-t border-[var(--color-foreground)] font-semibold"
        : "border-t border-[var(--color-border)]";

  return (
    <tr className={rowClass}>
      <td className="px-3 py-2 text-sm text-[var(--color-foreground)]">
        <div className="flex items-center gap-2">
          <span style={{ paddingLeft: `${indent * 18}px` }}>{label}</span>
          {tooltip && (
            <div className="group relative cursor-help" title={tooltip}>
              <Info className="h-3 w-3 text-[var(--accent-ink)] opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-foreground)]">
        {current}
      </td>
      {emptyComparatives().map((value, index) => (
        <td
          key={`${label}-comparative-${index}`}
          className="px-3 py-2 text-right font-mono text-sm text-[var(--color-muted-foreground)]"
        >
          {value}
        </td>
      ))}
    </tr>
  );
}

function BucketRows({
  bucket,
  currency,
  useNet,
}: {
  bucket: ReportBucket;
  currency: string;
  useNet: boolean;
}) {
  return (
    <>
      <StatementGroupLabel label={bucket.bucket} />
      {bucket.lines.map((line) => (
        <StatementValueRow
          key={`${bucket.bucket}-${line.category}`}
          label={line.category}
          current={formatAmount(useNet ? line.netAmount : line.grossAmount, currency)}
          indent={1}
        />
      ))}
      <StatementValueRow
        label={`Total ${bucket.bucket}`}
        current={formatAmount(useNet ? bucket.netSubtotal : bucket.subtotal, currency)}
        emphasis="subtotal"
        indent={1}
      />
    </>
  );
}

function BalanceSheetStatement({
  report,
}: {
  report: BalanceSheetReport;
}) {
  // retainedProfit is already baked into report.totalEquity by buildBalanceSheet
  const retainedProfit = report.retainedProfit;
  const totalEquityPosition = report.totalEquity;

  return (
    <FormalStatementShell
      title="Balance Sheet"
      subtitle="Condensed management balance sheet"
      meta={`${report.currency} / comparative columns reserved for future periods`}
      footnote="Opening balances, depreciation, accruals, and bank reconciliation balances are not yet modelled, so this should be used as a bookkeeping working statement rather than a statutory balance sheet."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <StatementTableHeader columns={Array.from(STATEMENT_COMPARATIVE_HEADERS)} />
          <tbody>
            <StatementGroupLabel label="Assets" />
            {report.assetSection.buckets.map((bucket) => (
              <BucketRows key={bucket.bucket} bucket={bucket} currency={report.currency} useNet={false} />
            ))}
            <StatementValueRow
              label="Total Assets"
              current={formatAmount(report.assetSection.total, report.currency)}
              emphasis="total"
            />

            <tr><td colSpan={1 + STATEMENT_COMPARATIVE_HEADERS.length} className="h-5" /></tr>

            <StatementGroupLabel label="Liabilities" />
            {report.liabilitySection.buckets.map((bucket) => (
              <BucketRows key={bucket.bucket} bucket={bucket} currency={report.currency} useNet={false} />
            ))}
            <StatementValueRow
              label="Total Liabilities"
              current={formatAmount(report.liabilitySection.total, report.currency)}
              emphasis="total"
            />

            <tr><td colSpan={1 + STATEMENT_COMPARATIVE_HEADERS.length} className="h-5" /></tr>

            <StatementGroupLabel label="Shareholders' / Owner's Equity" />
            {report.equitySection.buckets.map((bucket) => (
              <BucketRows key={bucket.bucket} bucket={bucket} currency={report.currency} useNet={false} />
            ))}
            <StatementValueRow
              label="Retained profit from Profit & Loss"
              current={formatAmount(retainedProfit, report.currency)}
              indent={1}
              tooltip="Current year net profit carried over from Profit & Loss."
            />
            <StatementValueRow
              label="Total Equity"
              current={formatAmount(totalEquityPosition, report.currency)}
              emphasis="total"
            />
            <StatementValueRow
              label="Total Liabilities & Equity"
              current={formatAmount(report.liabilitySection.total + totalEquityPosition, report.currency)}
              emphasis="total"
            />
          </tbody>
        </table>
      </div>
    </FormalStatementShell>
  );
}

function PnLCreditDebitStatement({ report }: { report: PnLReport }) {
  const isProfit = report.netProfit >= 0;

  return (
    <FormalStatementShell
      title="Profit and Loss"
      subtitle="Nominal-style management profit and loss"
      meta={`${report.currency} / debit / credit presentation`}
      footnote="Debit and credit columns are shown for recognisable bookkeeping presentation."
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="border-b-2 border-[var(--color-foreground)]">
              <th className="w-[48%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Description
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Debit
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Credit
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Prior
              </th>
            </tr>
          </thead>
          <tbody>
            <StatementGroupLabelPnL label="Income" />
            {report.incomeSection.buckets.map((bucket) => (
              <PnLBucketRows key={bucket.bucket} bucket={bucket} currency={report.currency} side="credit" />
            ))}
            <PnLValueRow
              label="Total Income"
              debit=""
              credit={formatAmount(report.incomeSection.netTotal, report.currency)}
              emphasis="subtotal"
            />

            <tr><td colSpan={4} className="h-5" /></tr>

            <StatementGroupLabelPnL label="Expenses" />
            {report.expenseSection.buckets.map((bucket) => (
              <PnLBucketRows key={bucket.bucket} bucket={bucket} currency={report.currency} side="debit" />
            ))}
            <PnLValueRow
              label="Total Expenses"
              debit={formatAmount(report.expenseSection.netTotal, report.currency)}
              credit=""
              emphasis="subtotal"
            />

            <tr><td colSpan={4} className="h-5" /></tr>

            <PnLValueRow
              label={`Net ${isProfit ? "Profit" : "Loss"}`}
              debit={isProfit ? "" : formatAmount(Math.abs(report.netProfit), report.currency)}
              credit={isProfit ? formatAmount(Math.abs(report.netProfit), report.currency) : ""}
              emphasis="total"
            />
          </tbody>
        </table>
      </div>
    </FormalStatementShell>
  );
}

function StatementGroupLabelPnL({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className="bg-[var(--color-panel)] px-3 py-2 text-sm font-bold text-[var(--color-foreground)]">
        {label}
      </td>
    </tr>
  );
}



function PnLBucketRows({
  bucket,
  currency,
  side,
}: {
  bucket: ReportBucket;
  currency: string;
  side: "debit" | "credit";
}) {
  return (
    <>
      <StatementGroupLabelPnL label={bucket.bucket} />
      {bucket.lines.map((line) => (
        <PnLValueRow
          key={`${bucket.bucket}-${line.category}`}
          label={line.category}
          debit={side === "debit" ? formatAmount(line.netAmount, currency) : ""}
          credit={side === "credit" ? formatAmount(line.netAmount, currency) : ""}
          indent={1}
          disallowedAmount={line.disallowedAmount}
          currency={currency}
        />
      ))}
      <PnLValueRow
        label={`Total ${bucket.bucket}`}
        debit={side === "debit" ? formatAmount(bucket.netSubtotal, currency) : ""}
        credit={side === "credit" ? formatAmount(bucket.netSubtotal, currency) : ""}
        emphasis="subtotal"
        indent={1}
      />
    </>
  );
}

function PnLValueRow({
  label,
  debit,
  credit,
  emphasis = "normal",
  indent = 0,
  disallowedAmount = 0,
  currency = "GBP",
}: {
  label: string;
  debit: string;
  credit: string;
  emphasis?: "normal" | "subtotal" | "total";
  indent?: number;
  disallowedAmount?: number;
  currency?: string;
}) {
  const rowClass =
    emphasis === "total"
      ? "border-t-2 border-b-2 border-[var(--color-foreground)] font-bold"
      : emphasis === "subtotal"
        ? "border-t border-[var(--color-foreground)] font-semibold"
        : "border-t border-[var(--color-border)]";

  const hasDisallowed = disallowedAmount > 0;

  return (
    <tr className={rowClass}>
      <td className="px-3 py-2 text-sm text-[var(--color-foreground)]">
        <div className="flex items-center gap-2">
          <span style={{ paddingLeft: `${indent * 18}px` }}>{label}</span>
          {hasDisallowed && (
            <div 
              className="group relative cursor-help"
              title={`Includes ${formatAmount(disallowedAmount, currency)} of non-allowable expenses (tax add-back).`}
            >
              <Info className="h-3 w-3 text-[var(--accent-ink)] opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-foreground)]">
        {debit || "-"}
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-foreground)]">
        {credit || "-"}
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-muted-foreground)]">
        -
      </td>
    </tr>
  );
}

function VatTab({ report }: { report: VatReport }) {
  if (!report.isVatRegistered) {
    return (
      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">VAT summary</h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          This workspace is currently set to non-VAT-registered, so no VAT position is being
          calculated. You can switch this on in{" "}
          <Link href="/settings" className="text-[var(--color-accent)] hover:underline">
            Settings
          </Link>.
        </p>
      </Card>
    );
  }

  const netDue = report.netVatPosition >= 0;

  return (
    <FormalStatementShell
      title="VAT Summary"
      subtitle="Working VAT summary for manual review"
      meta={`${report.currency} / not a filing submission`}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Output VAT" value={report.outputTax} currency={report.currency} />
        <MetricTile
          label="Input VAT"
          value={report.inputTaxRecoverable}
          currency={report.currency}
          emphasis="positive"
        />
        <MetricTile
          label="Non-recoverable VAT"
          value={report.inputTaxNonRecoverable}
          currency={report.currency}
          emphasis="negative"
        />
        <MetricTile
          label={netDue ? "Net VAT due" : "Net VAT reclaimable"}
          value={Math.abs(report.netVatPosition)}
          currency={report.currency}
          emphasis={netDue ? "negative" : "positive"}
        />
      </div>

      <VatDetailTable
        title="Output VAT"
        rows={report.outputLines}
        currency={report.currency}
        footerLabel="Total output VAT"
        footerValue={report.outputTax}
      />

      <VatDetailTable
        title="Input VAT"
        rows={report.inputLines}
        currency={report.currency}
        footerLabel="Recoverable input VAT"
        footerValue={report.inputTaxRecoverable}
      />
    </FormalStatementShell>
  );
}

function MetricTile({
  label,
  value,
  currency,
  emphasis = "neutral",
}: {
  label: string;
  value: number;
  currency: string;
  emphasis?: "neutral" | "positive" | "negative";
}) {
  const className =
    emphasis === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : emphasis === "negative"
        ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
        : "border-[var(--color-border)] bg-white text-[var(--color-foreground)]";

  return (
    <div className={`rounded-2xl border p-5 shadow-[var(--shadow-sm)] ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{formatAmount(value, currency)}</p>
    </div>
  );
}

function VatDetailTable({
  title,
  rows,
  currency,
  footerLabel,
  footerValue,
}: {
  title: string;
  rows: VatReport["outputLines"];
  currency: string;
  footerLabel: string;
  footerValue: number;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-[var(--color-panel)] px-4 py-2 text-sm font-bold text-[var(--color-foreground)]">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--color-foreground)]">
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Category
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Treatment
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Net
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              VAT
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${title}-${row.category}-${row.vatRate}-${index}`}
              className={index > 0 ? "border-t border-[var(--color-border)]" : ""}
            >
              <td className="px-4 py-2.5 text-[var(--color-foreground)]">{row.category}</td>
              <td className="px-4 py-2.5 text-[var(--color-muted-foreground)]">
                {TAX_TREATMENT_LABELS[row.taxTreatment as keyof typeof TAX_TREATMENT_LABELS] ?? row.taxTreatment}
                {row.vatRate > 0 ? ` (${row.vatRate}%)` : ""}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--color-foreground)]">
                {formatAmount(row.netAmount, currency)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-[var(--color-foreground)]">
                {formatAmount(row.taxAmount, currency)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--color-foreground)]">
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-[var(--color-foreground)]">
              {footerLabel}
            </td>
            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[var(--color-foreground)]">
              {formatAmount(footerValue, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function UncategorisedTab({
  transactions,
  currency,
}: {
  transactions: UncategorisedTransaction[];
  currency: string;
}) {
  if (transactions.length === 0) {
    return (
      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-emerald-700">
          All transactions are categorised
        </h3>
        <p className="text-sm text-emerald-700">
          Every transaction has been assigned a bookkeeping category, so the reporting set is complete.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          Uncategorised transactions
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          These items are still shown in the financial statements inside uncategorised buckets so totals stay complete, but they should still be reviewed and assigned properly before relying on the reports.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Merchant
              </th>
              <th className="hidden px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)] sm:table-cell">
                Description
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr
                key={tx.transactionId}
                className={index > 0 ? "border-t border-[var(--color-border)]" : ""}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-muted-foreground)]">
                  {tx.date
                    ? new Date(tx.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-foreground)]">{tx.merchant}</td>
                <td className="hidden px-4 py-2.5 text-[var(--color-muted-foreground)] sm:table-cell">
                  <span className="line-clamp-1">{tx.description}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[var(--color-foreground)]">
                  {formatAmount(tx.grossAmount, tx.currency)}
                  {tx.currency !== currency ? (
                    <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                      {tx.currency}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        You can clean these up from{" "}
        <Link href="/bookkeeping/transactions" className="text-[var(--color-accent)] hover:underline">
          Transactions
        </Link>{" "}
        or add matching rules in{" "}
        <Link href="/settings" className="text-[var(--color-accent)] hover:underline">
          Settings
        </Link>.
      </p>
    </Card>
  );
}

export function FinancialReports({
  pnl,
  balanceSheet,
  vatReport,
  uncategorised,
  currency,
  businessType,
  canSeeFullAccounting = false,
}: {
  pnl: PnLReport;
  balanceSheet: BalanceSheetReport;
  vatReport: VatReport;
  uncategorised: UncategorisedTransaction[];
  currency: string;
  businessType: Workspace["businessType"];
  canSeeFullAccounting?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("pnl");
  const isSoleTrader = businessType === "sole_trader" && !canSeeFullAccounting;

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: "pnl", label: isSoleTrader ? "Profit Summary" : "Profit & Loss" },
    { id: "vat", label: "VAT Summary" },
    { id: "uncategorised", label: "Uncategorised", badge: uncategorised.length || undefined },
  ];

  if (!isSoleTrader) {
    tabs.splice(1, 0, { id: "balance", label: "Balance Sheet" });
  }

  return (
    <div className="space-y-5">
      {isSoleTrader ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
          Sole trader mode keeps this area focused on profit, VAT, and review-ready bookkeeping totals.
          Full balance-sheet-style financial statements stay hidden to keep the workflow simpler.
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-sm)]">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-2)] hover:bg-[#f4f2ed]"
              }`}
            >
              {item.label}
              {item.badge !== undefined ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/25 text-white" : "bg-amber-100 text-amber-600"
                }`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "pnl" ? <PnLCreditDebitStatement report={pnl} /> : null}
      {tab === "balance" && !isSoleTrader ? (
        <BalanceSheetStatement report={balanceSheet} />
      ) : null}
      {tab === "vat" ? <VatTab report={vatReport} /> : null}
      {tab === "uncategorised" ? (
        <UncategorisedTab transactions={uncategorised} currency={currency} />
      ) : null}
    </div>
  );
}
