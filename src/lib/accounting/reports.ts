/**
 * Financial report builders.
 *
 * buildPnL           → Profit & Loss report
 * buildBalanceSheet  → Balance Sheet report
 * buildVatReport     → VAT / tax summary
 * buildUncategorised → Transactions still needing review
 */

import type { AccountType } from "@/lib/domain/types";
import type { ClassifiedTransaction } from "./classifier";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportLineItem {
  category: string;
  reportingBucket: string;
  transactionCount: number;
  grossAmount: number;
  netAmount: number;
  taxAmount: number;
  vatRecoverableAmount: number;
  disallowedAmount: number;
}

export interface ReportSection {
  title: string;
  accountType: AccountType;
  buckets: ReportBucket[];
  total: number;
  netTotal: number;
}

export interface ReportBucket {
  bucket: string;
  lines: ReportLineItem[];
  subtotal: number;
  netSubtotal: number;
}

// ── Profit & Loss ────────────────────────────────────────────────────────────

export interface PnLReport {
  currency: string;
  incomeSection: ReportSection;
  expenseSection: ReportSection;
  grossProfit: number;          // income net - cost of sales net
  netProfit: number;            // income net - all expense net
  totalIncomeTax: number;       // output VAT on income (if VAT registered)
  totalInputTax: number;        // recoverable input VAT on expenses
  totalInputTaxNonRecoverable: number;
  uncategorisedCount: number;
}

// ── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetReport {
  currency: string;
  assetSection: ReportSection;
  liabilitySection: ReportSection;
  equitySection: ReportSection;
  netAssets: number;            // total assets - total liabilities
  /** Retained profit from P&L included in total equity */
  retainedProfit: number;
  totalEquity: number;          // capital + retained profit - drawings
  uncategorisedCount: number;
}

// ── VAT Report ────────────────────────────────────────────────────────────────

export interface VatReportLine {
  category: string;
  reportingBucket: string;
  taxTreatment: string;
  vatRate: number;
  transactionCount: number;
  netAmount: number;
  taxAmount: number;
  vatRecoverable: boolean;
}

export interface VatReport {
  currency: string;
  isVatRegistered: boolean;
  outputTax: number;            // VAT on sales/income
  inputTaxRecoverable: number;  // VAT on purchases, recoverable
  inputTaxNonRecoverable: number;
  netVatPosition: number;       // outputTax - inputTaxRecoverable (positive = payable)
  outputLines: VatReportLine[];
  inputLines: VatReportLine[];
}

// ── Uncategorised ─────────────────────────────────────────────────────────────

export interface UncategorisedTransaction {
  transactionId: string;
  date?: string;
  merchant: string;
  description: string;
  grossAmount: number;
  currency: string;
  employee?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function buildSection(
  transactions: ClassifiedTransaction[],
  accountType: AccountType,
  title: string,
): ReportSection {
  const filtered = transactions.filter((t) => t.accountType === accountType);

  // Group by reporting bucket
  const byBucket = groupBy(filtered, (t) => t.reportingBucket);

  const buckets: ReportBucket[] = Array.from(byBucket.entries())
    .map(([bucket, txs]) => {
      // Group by category within each bucket
      const byCategory = groupBy(txs, (t) => t.category.trim());
      const lines: ReportLineItem[] = Array.from(byCategory.entries()).map(
        ([category, catTxs]) => ({
          category,
          reportingBucket: bucket,
          transactionCount: catTxs.length,
          grossAmount: round2(catTxs.reduce((s, t) => s + t.grossAmount, 0)),
          netAmount: round2(catTxs.reduce((s, t) => s + t.netAmount, 0)),
          taxAmount: round2(catTxs.reduce((s, t) => s + t.taxAmount, 0)),
          vatRecoverableAmount: round2(
            catTxs
              .filter((t) => t.vatRecoverable)
              .reduce((s, t) => s + t.taxAmount, 0),
          ),
          disallowedAmount: round2(catTxs.reduce((s, t) => s + t.disallowedAmount, 0)),
        }),
      );
      const subtotal = round2(lines.reduce((s, l) => s + l.grossAmount, 0));
      const netSubtotal = round2(lines.reduce((s, l) => s + l.netAmount, 0));
      return { bucket, lines, subtotal, netSubtotal };
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  return {
    title,
    accountType,
    buckets,
    total: round2(buckets.reduce((s, b) => s + b.subtotal, 0)),
    netTotal: round2(buckets.reduce((s, b) => s + b.netSubtotal, 0)),
  };
}

// ─── P&L builder ─────────────────────────────────────────────────────────────

export function buildPnL(
  transactions: ClassifiedTransaction[],
  currency: string,
): PnLReport {
  const pnlTxs = transactions.filter((t) => t.statementType === "p_and_l");

  const incomeSection = buildSection(pnlTxs, "income", "Income");
  const expenseSection = buildSection(pnlTxs, "expense", "Expenses");

  // Net profit = income net - expense net
  const netProfit = round2(incomeSection.netTotal - expenseSection.netTotal);

  // Gross profit = income net - cost of sales net
  const costOfSales = expenseSection.buckets
    .filter((b) => b.bucket.toLowerCase().includes("cost of sales") || b.bucket.toLowerCase().includes("cost of goods"))
    .reduce((s, b) => s + b.netSubtotal, 0);
  const grossProfit = round2(incomeSection.netTotal - costOfSales);

  // VAT
  const totalIncomeTax = round2(
    pnlTxs
      .filter((t) => t.accountType === "income")
      .reduce((s, t) => s + t.taxAmount, 0),
  );
  const totalInputTax = round2(
    pnlTxs
      .filter((t) => t.accountType === "expense" && t.vatRecoverable)
      .reduce((s, t) => s + t.taxAmount, 0),
  );
  const totalInputTaxNonRecoverable = round2(
    pnlTxs
      .filter((t) => t.accountType === "expense" && !t.vatRecoverable)
      .reduce((s, t) => s + t.taxAmount, 0),
  );

  const uncategorisedCount = pnlTxs.filter((t) => t.category === "Uncategorised").length;

  return {
    currency,
    incomeSection,
    expenseSection,
    grossProfit,
    netProfit,
    totalIncomeTax,
    totalInputTax,
    totalInputTaxNonRecoverable,
    uncategorisedCount,
  };
}

// ─── Balance Sheet builder ────────────────────────────────────────────────────

export function buildBalanceSheet(
  transactions: ClassifiedTransaction[],
  currency: string,
): BalanceSheetReport {
  const bsTxs = transactions.filter(
    (t) =>
      (t.statementType === "balance_sheet" || t.statementType === "equity_movement") &&
      t.category !== "Uncategorised",
  );

  const assetSection = buildSection(bsTxs, "asset", "Assets");
  const liabilitySection = buildSection(bsTxs, "liability", "Liabilities");
  const equitySection = buildSection(bsTxs, "equity", "Equity Movements");

  const netAssets = round2(assetSection.total - liabilitySection.total);

  // Equity = capital introduced - drawings + retained profit (net P&L)
  // Retained profit is derived from all P&L transactions
  const pnlTxs = transactions.filter(
    (t) => t.statementType === "p_and_l" && t.category !== "Uncategorised",
  );
  const retainedProfit = round2(
    pnlTxs
      .filter((t) => t.accountType === "income")
      .reduce((s, t) => s + t.netAmount, 0) -
    pnlTxs
      .filter((t) => t.accountType === "expense")
      .reduce((s, t) => s + t.netAmount, 0),
  );

  const capitalIntroduced = equitySection.buckets
    .filter((b) => b.bucket.toLowerCase().includes("capital"))
    .reduce((s, b) => s + b.subtotal, 0);
  const drawings = equitySection.buckets
    .filter((b) => b.bucket.toLowerCase().includes("drawings") || b.bucket.toLowerCase().includes("drawing"))
    .reduce((s, b) => s + b.subtotal, 0);
  const totalEquity = round2(capitalIntroduced - drawings + retainedProfit);

  const uncategorisedCount = transactions.filter(
    (t) =>
      t.category === "Uncategorised" &&
      (t.statementType === "balance_sheet" || t.statementType === "equity_movement"),
  ).length;

  return {
    currency,
    assetSection,
    liabilitySection,
    equitySection,
    netAssets,
    retainedProfit,
    totalEquity,
    uncategorisedCount,
  };
}

// ─── VAT report builder ───────────────────────────────────────────────────────

export function buildVatReport(
  transactions: ClassifiedTransaction[],
  currency: string,
  vatRegistered: boolean,
): VatReport {
  if (!vatRegistered) {
    return {
      currency,
      isVatRegistered: false,
      outputTax: 0,
      inputTaxRecoverable: 0,
      inputTaxNonRecoverable: 0,
      netVatPosition: 0,
      outputLines: [],
      inputLines: [],
    };
  }

  // Only include transactions where tax was actually charged/recoverable
  const withTax = transactions.filter((t) => t.taxAmount !== 0);

  // Output tax: VAT on income
  const incomeTxs = withTax.filter((t) => t.accountType === "income");
  // Input tax: VAT on expenses, assets
  const purchaseTxs = withTax.filter(
    (t) => t.accountType === "expense" || t.accountType === "asset",
  );

  function buildVatLines(txs: ClassifiedTransaction[], isOutput: boolean): VatReportLine[] {
    const byCatRate = groupBy(txs, (t) => `${t.category.trim()}::${t.effectiveVatRate}`);
    return Array.from(byCatRate.entries())
      .map(([key, items]) => {
        const [category] = key.split("::");
        const item0 = items[0];
        return {
          category,
          reportingBucket: item0.reportingBucket,
          taxTreatment: item0.effectiveTaxTreatment,
          vatRate: item0.effectiveVatRate,
          transactionCount: items.length,
          netAmount: round2(items.reduce((s, t) => s + t.netAmount, 0)),
          taxAmount: round2(items.reduce((s, t) => s + t.taxAmount, 0)),
          vatRecoverable: isOutput ? true : item0.vatRecoverable,
        };
      })
      .filter((l) => l.taxAmount > 0 || l.netAmount > 0)
      .sort((a, b) => b.taxAmount - a.taxAmount);
  }

  const outputLines = buildVatLines(incomeTxs, true);
  const inputLines = buildVatLines(purchaseTxs, false);

  const outputTax = round2(outputLines.reduce((s, l) => s + l.taxAmount, 0));
  const inputTaxRecoverable = round2(
    inputLines.filter((l) => l.vatRecoverable).reduce((s, l) => s + l.taxAmount, 0),
  );
  const inputTaxNonRecoverable = round2(
    inputLines.filter((l) => !l.vatRecoverable).reduce((s, l) => s + l.taxAmount, 0),
  );

  return {
    currency,
    isVatRegistered: true,
    outputTax,
    inputTaxRecoverable,
    inputTaxNonRecoverable,
    netVatPosition: round2(outputTax - inputTaxRecoverable),
    outputLines,
    inputLines,
  };
}

// ─── Uncategorised report ─────────────────────────────────────────────────────

export function buildUncategorisedList(
  transactions: ClassifiedTransaction[],
): UncategorisedTransaction[] {
  return transactions
    .filter((t) => t.category === "Uncategorised")
    .map((t) => ({
      transactionId: t.transactionId,
      date: t.date,
      merchant: t.merchant,
      description: t.description,
      grossAmount: t.grossAmount,
      currency: t.currency,
      employee: t.employee,
    }));
}
