/**
 * Period Export Pack — Excel workbook generator.
 *
 * Uses exceljs to produce a clean, accountant-friendly multi-sheet workbook
 * from the same classified transaction data that drives the bookkeeping reports.
 *
 * Sheets:
 *  1. Summary
 *  2. Profit & Loss
 *  3. Tax Summary
 *  4. Transactions
 *  5. Reconciliation
 *  6. Needs Review
 *  7. VAT Summary (if VAT-registered)
 *  8. Balance Sheet
 */

import ExcelJS from "exceljs";
import type { ClassifiedTransaction } from "@/lib/accounting/classifier";
import type { PnLReport, VatReport, BalanceSheetReport } from "@/lib/accounting/reports";
import type { TaxSummaryReport } from "@/lib/accounting/tax-summary";
import type { ReviewRow, ReconciliationRun } from "@/lib/domain/types";

// ─── Style helpers ────────────────────────────────────────────────────────────

const BRAND_DARK = "FF0F1720";
const BRAND_ACCENT = "FF4F7DF3";
const GREY_LIGHT = "FFF3F4F6";
const GREY_MID = "FFE5E7EB";
const GREEN_LIGHT = "FFD1FAE5";
const AMBER_LIGHT = "FFFEF3C7";
const RED_LIGHT = "FFFEE2E2";

function headerFill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: hex } };
}

function applyHeaderRow(row: ExcelJS.Row, bgArgb: string = BRAND_DARK, fgArgb: string = "FFFFFFFF") {
  row.eachCell((cell) => {
    cell.fill = headerFill(bgArgb);
    cell.font = { bold: true, color: { argb: fgArgb }, size: 9 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  });
  row.height = 24;
}

function applyTotalRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = headerFill(GREY_LIGHT);
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "double", color: { argb: "FF6B7280" } },
    };
  });
}

function moneyFmt(sheet: ExcelJS.Worksheet, col: number) {
  sheet.getColumn(col).numFmt = "#,##0.00";
  sheet.getColumn(col).width = 14;
}

function dateFmt(sheet: ExcelJS.Worksheet, col: number) {
  sheet.getColumn(col).numFmt = "dd/mm/yyyy";
  sheet.getColumn(col).width = 12;
}

function setColWidths(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

function freezeFirstRow(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function labelValueBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  items: [string, string | number][],
  currency: string,
) {
  items.forEach(([label, value], i) => {
    const row = sheet.getRow(startRow + i);
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);
    labelCell.value = label;
    labelCell.font = { size: 9, color: { argb: "FF6B7280" } };
    if (typeof value === "number") {
      valueCell.value = value;
      valueCell.numFmt = `"${currency} "#,##0.00`;
      valueCell.font = { size: 10, bold: true };
    } else {
      valueCell.value = value;
      valueCell.font = { size: 10, bold: true };
    }
    row.commit();
  });
}

// ─── Sheet 1: Summary ─────────────────────────────────────────────────────────

export function buildSummarySheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    workspaceName: string;
    period: string;
    exportedAt: string;
    includeDraft: boolean;
    currency: string;
    totalIncome: number;
    totalExpenses: number;
    accountingProfit: number;
    taxableProfit: number;
    vatEnabled: boolean;
    netVatPosition: number;
    runCount: number;
    transactionCount: number;
  },
) {
  sheet.mergeCells("A1:D1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${opts.workspaceName} — Period Export Pack`;
  titleCell.font = { bold: true, size: 14, color: { argb: BRAND_DARK } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:D2");
  const subCell = sheet.getCell("A2");
  subCell.value = `Period: ${opts.period}   |   Exported: ${opts.exportedAt}   |   Mode: ${opts.includeDraft ? "All data (includes drafts)" : "Confirmed only"}`;
  subCell.font = { size: 9, color: { argb: "FF6B7280" } };
  sheet.getRow(2).height = 18;

  sheet.getRow(3).height = 10;

  // Financial summary block
  sheet.getRow(4).getCell(1).value = "FINANCIAL OVERVIEW";
  sheet.getRow(4).getCell(1).font = { bold: true, size: 9, color: { argb: "FF9CA3AF" } };

  labelValueBlock(sheet, 5, [
    ["Total Income", opts.totalIncome],
    ["Total Expenses", opts.totalExpenses],
    ["Accounting Profit / (Loss)", opts.accountingProfit],
    ["Taxable Profit", opts.taxableProfit],
    ...(opts.vatEnabled ? [["Net VAT Position", opts.netVatPosition] as [string, number]] : []),
  ], opts.currency);

  const nextRow = opts.vatEnabled ? 11 : 10;
  sheet.getRow(nextRow).height = 10;
  sheet.getRow(nextRow + 1).getCell(1).value = "DATA COVERAGE";
  sheet.getRow(nextRow + 1).getCell(1).font = { bold: true, size: 9, color: { argb: "FF9CA3AF" } };

  labelValueBlock(sheet, nextRow + 2, [
    ["Reconciliation Runs", String(opts.runCount)],
    ["Transactions", String(opts.transactionCount)],
    ["Period", opts.period],
    ["Draft items included", opts.includeDraft ? "Yes" : "No — confirmed data only"],
  ], opts.currency);

  setColWidths(sheet, [28, 20, 20, 20]);
}

// ─── Sheet 2: P&L ─────────────────────────────────────────────────────────────

export function buildPnLSheet(sheet: ExcelJS.Worksheet, pnl: PnLReport) {
  const currency = pnl.currency;

  // Headers
  const headerRow = sheet.addRow(["Section", "Bucket", "Category", "Transactions", "Net Amount"]);
  applyHeaderRow(headerRow);
  freezeFirstRow(sheet);
  setColWidths(sheet, [14, 24, 32, 12, 16]);
  moneyFmt(sheet, 5);

  let incomeTotal = 0;
  let expenseTotal = 0;

  // Income
  for (const bucket of pnl.incomeSection.buckets) {
    for (const line of bucket.lines) {
      const row = sheet.addRow(["Income", bucket.bucket, line.category, line.transactionCount, line.netAmount]);
      row.getCell(1).fill = headerFill(GREEN_LIGHT);
      row.getCell(2).fill = headerFill(GREEN_LIGHT);
      row.eachCell((c) => { c.font = { size: 9 }; });
      incomeTotal += line.netAmount;
    }
  }
  const incomeTotalRow = sheet.addRow(["", "", "Total Income", "", incomeTotal]);
  applyTotalRow(incomeTotalRow);

  sheet.addRow([]);

  // Expenses
  for (const bucket of pnl.expenseSection.buckets) {
    for (const line of bucket.lines) {
      const row = sheet.addRow(["Expense", bucket.bucket, line.category, line.transactionCount, line.netAmount]);
      row.getCell(1).fill = headerFill(AMBER_LIGHT);
      row.getCell(2).fill = headerFill(AMBER_LIGHT);
      row.eachCell((c) => { c.font = { size: 9 }; });
      expenseTotal += line.netAmount;
    }
  }
  const expenseTotalRow = sheet.addRow(["", "", "Total Expenses", "", expenseTotal]);
  applyTotalRow(expenseTotalRow);

  sheet.addRow([]);

  const profitRow = sheet.addRow(["", "", "Net Profit / (Loss)", "", pnl.netProfit]);
  profitRow.eachCell((c) => {
    c.font = { bold: true, size: 10 };
    c.fill = headerFill(pnl.netProfit >= 0 ? GREEN_LIGHT : RED_LIGHT);
  });

  // Disclaimer note
  sheet.addRow([]);
  const noteRow = sheet.addRow([`All amounts in ${currency}. Net amounts (VAT excluded where recoverable).`]);
  noteRow.getCell(1).font = { size: 8, italic: true, color: { argb: "FF9CA3AF" } };
}

// ─── Sheet 3: Tax Summary ─────────────────────────────────────────────────────

export function buildTaxSummarySheet(sheet: ExcelJS.Worksheet, tax: TaxSummaryReport) {
  const c = tax.currency;
  setColWidths(sheet, [36, 22, 22, 22, 14]);

  const titleRow = sheet.addRow(["TAX SUMMARY"]);
  titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: BRAND_DARK } };
  sheet.addRow([]);

  // Accounting section
  const accHeader = sheet.addRow(["ACCOUNTING VIEW", "", "", ""]);
  applyHeaderRow(accHeader, BRAND_DARK);
  sheet.mergeCells(`A${accHeader.number}:E${accHeader.number}`);

  sheet.addRow(["Total Income", "", "", "", tax.profitSummary.totalIncome]);
  sheet.addRow(["Total Expenses (P&L)", "", "", "", tax.profitSummary.totalExpenses]);
  const apRow = sheet.addRow(["Accounting Profit / (Loss)", "", "", "", tax.profitSummary.accountingProfit]);
  apRow.getCell(5).font = { bold: true };

  sheet.addRow([]);

  // Tax adjustments
  const taxHeader = sheet.addRow(["TAX ADJUSTMENTS", "", "", ""]);
  applyHeaderRow(taxHeader, BRAND_DARK);
  sheet.mergeCells(`A${taxHeader.number}:E${taxHeader.number}`);

  // Fully claimable
  if (tax.fullyClaimableCategories.length > 0) {
    const h = sheet.addRow(["Category", "Accounting Amt", "Claimable %", "Claimable Amt", "Add-back"]);
    applyHeaderRow(h, "FF065F46", "FFFFFFFF"); // deep green
    for (const cat of tax.fullyClaimableCategories) {
      const row = sheet.addRow([cat.category, cat.accountingAmount, 100, cat.claimableAmount, 0]);
      row.getCell(1).fill = headerFill(GREEN_LIGHT);
      row.eachCell((c) => { c.font = { size: 9 }; });
    }
  }

  // Partially claimable
  if (tax.partiallyClaimableCategories.length > 0) {
    const h = sheet.addRow(["Category (Partial)", "Accounting Amt", "Claimable %", "Claimable Amt", "Add-back"]);
    applyHeaderRow(h, "FF92400E", "FFFFFFFF"); // amber
    for (const cat of tax.partiallyClaimableCategories) {
      const row = sheet.addRow([cat.category, cat.accountingAmount, cat.allowablePercentage, cat.claimableAmount, cat.nonClaimableAmount]);
      row.getCell(1).fill = headerFill(AMBER_LIGHT);
      row.eachCell((c) => { c.font = { size: 9 }; });
    }
  }

  // Non-claimable
  if (tax.nonClaimableCategories.length > 0) {
    const h = sheet.addRow(["Category (Non-claimable)", "Accounting Amt", "Claimable %", "Claimable Amt", "Add-back"]);
    applyHeaderRow(h, "FF991B1B", "FFFFFFFF"); // red
    for (const cat of tax.nonClaimableCategories) {
      const row = sheet.addRow([cat.category, cat.accountingAmount, 0, 0, cat.nonClaimableAmount]);
      row.getCell(1).fill = headerFill(RED_LIGHT);
      row.eachCell((c) => { c.font = { size: 9 }; });
    }
  }

  sheet.addRow([]);

  // Taxable profit bridge
  const tpHeader = sheet.addRow(["TAXABLE PROFIT"]);
  applyHeaderRow(tpHeader, BRAND_ACCENT);
  sheet.mergeCells(`A${tpHeader.number}:E${tpHeader.number}`);

  const categorizedDisallowed = Math.max(0, tax.profitSummary.totalTaxAdjustments - tax.profitSummary.uncategorizedExpenses);
  sheet.addRow(["Accounting Profit", "", "", "", tax.profitSummary.accountingProfit]);
  sheet.addRow(["Add: Disallowed Expenses", "", "", "", categorizedDisallowed]);
  if (tax.profitSummary.uncategorizedExpenses > 0) {
    sheet.addRow(["Add: Uncategorized Expenses", "", "", "", tax.profitSummary.uncategorizedExpenses]);
  }
  const tpRow = sheet.addRow(["Taxable Profit", "", "", "", tax.profitSummary.taxableProfit]);
  tpRow.eachCell((c) => { c.font = { bold: true }; c.fill = headerFill(GREEN_LIGHT); });

  // Estimated tax if available
  if (tax.estimatedTax) {
    sheet.addRow([]);
    const estHeader = sheet.addRow([`ESTIMATED TAX (${tax.estimatedTax.taxYearLabel})`]);
    applyHeaderRow(estHeader, BRAND_DARK);
    sheet.mergeCells(`A${estHeader.number}:E${estHeader.number}`);

    sheet.addRow(["Taxable Profit", "", "", "", tax.estimatedTax.taxableProfitStartingPoint]);
    sheet.addRow(["Less: Personal Allowance", "", "", "", -tax.estimatedTax.personalAllowanceUsed]);
    sheet.addRow(["Taxable Income After Allowance", "", "", "", tax.estimatedTax.taxableIncomeAfterAllowance]);
    sheet.addRow(["Estimated Income Tax", "", "", "", tax.estimatedTax.estimatedIncomeTax]);
    sheet.addRow(["Estimated National Insurance", "", "", "", tax.estimatedTax.estimatedNationalInsurance]);
    const totTaxRow = sheet.addRow(["Total Estimated Tax", "", "", "", tax.estimatedTax.totalEstimatedTax]);
    totTaxRow.eachCell((c) => { c.font = { bold: true }; c.fill = headerFill(AMBER_LIGHT); });
  }

  // Format money column
  [2, 4, 5].forEach((col) => moneyFmt(sheet, col));

  sheet.addRow([]);
  const disc = sheet.addRow(["Estimates only. Not a filing output. Based on categorised transaction data."]);
  disc.getCell(1).font = { size: 8, italic: true, color: { argb: "FF9CA3AF" } };
}

// ─── Sheet 4: Transactions ────────────────────────────────────────────────────

export function buildTransactionsSheet(sheet: ExcelJS.Worksheet, transactions: ClassifiedTransaction[]) {
  const headers = [
    "Date", "Merchant / Supplier", "Description", "Currency", "Gross Amount",
    "Net Amount", "VAT Amount", "Direction", "Category", "Bucket",
    "Account Type", "Statement", "Tax Treatment", "VAT Rate %",
    "Allowable %", "Claimable Amt", "Non-Claimable Amt",
    "GL Code", "Reference",
  ];
  const headerRow = sheet.addRow(headers);
  applyHeaderRow(headerRow);
  freezeFirstRow(sheet);
  setColWidths(sheet, [12, 22, 28, 8, 14, 14, 12, 10, 22, 18, 12, 14, 16, 10, 10, 14, 14, 10, 14]);
  dateFmt(sheet, 1);
  [5, 6, 7, 16, 17].forEach((col) => moneyFmt(sheet, col));

  for (const tx of transactions) {
    const direction = tx.accountType === "income" ? "IN" : "OUT";
    const row = sheet.addRow([
      tx.date ?? "",
      tx.merchant,
      tx.description,
      tx.currency,
      tx.grossAmount,
      tx.netAmount,
      tx.taxAmount,
      direction,
      tx.category,
      tx.reportingBucket,
      tx.accountType,
      tx.statementType,
      tx.effectiveTaxTreatment,
      tx.effectiveVatRate,
      tx.allowablePercentage,
      tx.allowableAmount,
      tx.disallowedAmount,
      tx.glCode ?? "",
      tx.reference ?? "",
    ]);
    row.eachCell((c) => { c.font = { size: 9 }; });
    if (direction === "IN") {
      row.getCell(8).fill = headerFill(GREEN_LIGHT);
    } else if (tx.disallowedAmount > 0) {
      row.getCell(17).fill = headerFill(AMBER_LIGHT);
    }
    row.commit();
  }

  if (transactions.length === 0) {
    const empty = sheet.addRow(["No transactions for this period."]);
    empty.getCell(1).font = { italic: true, color: { argb: "FF9CA3AF" }, size: 9 };
  }
}

// ─── Sheet 5: Reconciliation ──────────────────────────────────────────────────

export function buildReconciliationSheet(sheet: ExcelJS.Worksheet, rows: ReviewRow[]) {
  const headers = [
    "Source", "Supplier / Merchant", "Date", "Currency",
    "Net", "VAT", "Gross", "Bank Amount", "Difference",
    "Match Status", "Comparison", "VAT Code", "GL Code",
    "Reference", "Invoice No.",
  ];
  const headerRow = sheet.addRow(headers);
  applyHeaderRow(headerRow);
  freezeFirstRow(sheet);
  setColWidths(sheet, [22, 24, 12, 8, 12, 10, 12, 12, 12, 16, 12, 10, 10, 14, 14]);
  dateFmt(sheet, 3);
  [5, 6, 7, 8, 9].forEach((col) => moneyFmt(sheet, col));

  for (const row of rows) {
    const diff = row.grossDifference ?? 0;
    const dataRow = sheet.addRow([
      row.source,
      row.supplier,
      row.date ?? "",
      row.currency,
      row.net ?? 0,
      row.vat ?? 0,
      row.gross ?? 0,
      row.bankTransactionAmount,
      diff,
      row.grossComparisonStatus ?? "",
      row.grossComparisonStatus ?? "",
      row.vatCode ?? "",
      row.glCode ?? "",
      row.reference ?? "",
      row.invoiceNumber ?? "",
    ]);
    dataRow.eachCell((c) => { c.font = { size: 9 }; });
    if (Math.abs(diff) < 0.01) {
      dataRow.getCell(9).fill = headerFill(GREEN_LIGHT);
    } else if (Math.abs(diff) > 1) {
      dataRow.getCell(9).fill = headerFill(AMBER_LIGHT);
    }
    dataRow.commit();
  }

  if (rows.length === 0) {
    const empty = sheet.addRow(["No reconciliation rows for this period."]);
    empty.getCell(1).font = { italic: true, color: { argb: "FF9CA3AF" }, size: 9 };
  }
}

// ─── Sheet 6: Needs Review ────────────────────────────────────────────────────

export function buildNeedsReviewSheet(
  sheet: ExcelJS.Worksheet,
  unmatched: ClassifiedTransaction[],
  needsReviewRows: ReviewRow[],
) {
  const headers = ["Type", "Date", "Merchant / Supplier", "Description", "Amount", "Currency", "Category", "Issue"];
  const headerRow = sheet.addRow(headers);
  applyHeaderRow(headerRow, "FF7C3AED");
  freezeFirstRow(sheet);
  setColWidths(sheet, [18, 12, 24, 32, 14, 8, 22, 24]);
  dateFmt(sheet, 2);
  moneyFmt(sheet, 5);

  for (const tx of unmatched) {
    const row = sheet.addRow([
      "Uncategorised transaction",
      tx.date ?? "",
      tx.merchant,
      tx.description,
      tx.grossAmount,
      tx.currency,
      tx.category,
      "Not categorised",
    ]);
    row.getCell(1).fill = headerFill(AMBER_LIGHT);
    row.eachCell((c) => { c.font = { size: 9 }; });
    row.commit();
  }

  for (const row of needsReviewRows) {
    const dataRow = sheet.addRow([
      "Review item",
      row.date ?? "",
      row.supplier,
      row.source,
      row.gross ?? 0,
      row.currency,
      "",
      row.grossComparisonStatus ?? "Needs review",
    ]);
    dataRow.getCell(1).fill = headerFill(RED_LIGHT);
    dataRow.eachCell((c) => { c.font = { size: 9 }; });
    dataRow.commit();
  }

  if (unmatched.length === 0 && needsReviewRows.length === 0) {
    const empty = sheet.addRow(["Nothing needs review for this period. ✓"]);
    empty.getCell(1).font = { italic: true, color: { argb: "FF065F46" }, size: 9 };
  }
}

// ─── Sheet 7: VAT Summary ─────────────────────────────────────────────────────

export function buildVatSummarySheet(sheet: ExcelJS.Worksheet, vatReport: VatReport) {
  setColWidths(sheet, [30, 18, 12, 14, 14, 8]);

  if (!vatReport.isVatRegistered) {
    sheet.addRow(["VAT not enabled for this workspace."]);
    sheet.getRow(1).getCell(1).font = { italic: true, color: { argb: "FF9CA3AF" } };
    return;
  }

  // Summary block
  const summaryHeader = sheet.addRow(["VAT POSITION SUMMARY"]);
  applyHeaderRow(summaryHeader, BRAND_DARK);
  sheet.mergeCells(`A${summaryHeader.number}:F${summaryHeader.number}`);

  sheet.addRow(["Output VAT (on sales)", "", "", "", vatReport.outputTax]);
  sheet.addRow(["Input VAT (recoverable)", "", "", "", vatReport.inputTaxRecoverable]);
  sheet.addRow(["Input VAT (non-recoverable)", "", "", "", vatReport.inputTaxNonRecoverable]);
  const netRow = sheet.addRow([vatReport.netVatPosition >= 0 ? "Net VAT Due" : "Net VAT Reclaimable", "", "", "", Math.abs(vatReport.netVatPosition)]);
  netRow.eachCell((c) => { c.font = { bold: true }; c.fill = headerFill(AMBER_LIGHT); });
  moneyFmt(sheet, 5);

  sheet.addRow([]);

  // Output lines
  const outHeader = sheet.addRow(["Category", "Bucket", "Treatment", "Rate %", "Net", "VAT"]);
  applyHeaderRow(outHeader, "FF065F46", "FFFFFFFF");
  outHeader.getCell(1).value = "OUTPUT VAT — categories";
  [5, 6].forEach((col) => moneyFmt(sheet, col));

  for (const line of vatReport.outputLines) {
    const row = sheet.addRow([line.category, line.reportingBucket, line.taxTreatment, line.vatRate, line.netAmount, line.taxAmount]);
    row.getCell(1).fill = headerFill(GREEN_LIGHT);
    row.eachCell((c) => { c.font = { size: 9 }; });
    row.commit();
  }

  sheet.addRow([]);

  // Input lines
  const inHeader = sheet.addRow(["Category", "Bucket", "Treatment", "Rate %", "Net", "VAT"]);
  applyHeaderRow(inHeader, "FF92400E", "FFFFFFFF");
  inHeader.getCell(1).value = "INPUT VAT — categories";

  for (const line of vatReport.inputLines) {
    const row = sheet.addRow([line.category, line.reportingBucket, line.taxTreatment, line.vatRate, line.netAmount, line.taxAmount]);
    row.getCell(1).fill = headerFill(line.vatRecoverable ? AMBER_LIGHT : RED_LIGHT);
    row.eachCell((c) => { c.font = { size: 9 }; });
    row.commit();
  }
}

// ─── Sheet 8: Balance Sheet ───────────────────────────────────────────────────

export function buildBalanceSheetSheet(sheet: ExcelJS.Worksheet, bs: BalanceSheetReport) {
  setColWidths(sheet, [12, 24, 32, 14]);
  const headers = ["Type", "Bucket", "Category", "Amount"];
  const headerRow = sheet.addRow(headers);
  applyHeaderRow(headerRow);
  freezeFirstRow(sheet);
  moneyFmt(sheet, 4);

  const sections = [
    { label: "ASSETS", section: bs.assetSection, bg: GREEN_LIGHT },
    { label: "LIABILITIES", section: bs.liabilitySection, bg: AMBER_LIGHT },
    { label: "EQUITY MOVEMENTS", section: bs.equitySection, bg: RED_LIGHT },
  ] as const;

  for (const { label, section, bg } of sections) {
    const hRow = sheet.addRow([label, "", "", ""]);
    applyHeaderRow(hRow, BRAND_DARK);
    sheet.mergeCells(`A${hRow.number}:D${hRow.number}`);

    for (const bucket of section.buckets) {
      for (const line of bucket.lines) {
        const row = sheet.addRow([label, bucket.bucket, line.category, line.netAmount]);
        row.getCell(1).fill = headerFill(bg);
        row.getCell(2).fill = headerFill(bg);
        row.eachCell((c) => { c.font = { size: 9 }; });
        row.commit();
      }
    }
    const totalRow = sheet.addRow(["", "", `Total ${label.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}`, section.netTotal]);
    applyTotalRow(totalRow);
    sheet.addRow([]);
  }
}

// ─── Master workbook builder ──────────────────────────────────────────────────

export interface PeriodExportOptions {
  workspaceName: string;
  period: string;
  includeDraft: boolean;
  currency: string;
  pnl: PnLReport;
  taxSummary: TaxSummaryReport;
  vatReport: VatReport;
  balanceSheet: BalanceSheetReport;
  allTransactions: ClassifiedTransaction[];
  reconciliationRows: ReviewRow[];
  unmatchedTransactions: ClassifiedTransaction[];
  needsReviewRows: ReviewRow[];
  runs: Pick<ReconciliationRun, "id" | "name" | "period" | "status">[];
}

export async function buildPeriodExportWorkbook(opts: PeriodExportOptions): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ClearMatch";
  wb.created = new Date();
  wb.modified = new Date();

  const exportedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // 1. Summary
  const summarySheet = wb.addWorksheet("Summary", { properties: { tabColor: { argb: BRAND_ACCENT } } });
  buildSummarySheet(summarySheet, {
    workspaceName: opts.workspaceName,
    period: opts.period,
    exportedAt,
    includeDraft: opts.includeDraft,
    currency: opts.currency,
    totalIncome: opts.pnl.incomeSection.netTotal,
    totalExpenses: opts.pnl.expenseSection.netTotal,
    accountingProfit: opts.pnl.netProfit,
    taxableProfit: opts.taxSummary.profitSummary.taxableProfit,
    vatEnabled: opts.vatReport.isVatRegistered,
    netVatPosition: opts.vatReport.netVatPosition,
    runCount: opts.runs.length,
    transactionCount: opts.allTransactions.length,
  });

  // 2. P&L
  const pnlSheet = wb.addWorksheet("Profit & Loss", { properties: { tabColor: { argb: "FF064E3B" } } });
  buildPnLSheet(pnlSheet, opts.pnl);

  // 3. Tax Summary
  const taxSheet = wb.addWorksheet("Tax Summary", { properties: { tabColor: { argb: "FF92400E" } } });
  buildTaxSummarySheet(taxSheet, opts.taxSummary);

  // 4. Transactions
  const txSheet = wb.addWorksheet("Transactions", { properties: { tabColor: { argb: "FF1E3A5F" } } });
  buildTransactionsSheet(txSheet, opts.allTransactions);

  // 5. Reconciliation
  const reconSheet = wb.addWorksheet("Reconciliation", { properties: { tabColor: { argb: "FF5B21B6" } } });
  buildReconciliationSheet(reconSheet, opts.reconciliationRows);

  // 6. Needs Review
  const reviewSheet = wb.addWorksheet("Needs Review", { properties: { tabColor: { argb: "FFB45309" } } });
  buildNeedsReviewSheet(reviewSheet, opts.unmatchedTransactions, opts.needsReviewRows);

  // 7. VAT Summary (always include — will show disabled message if not VAT registered)
  const vatSheet = wb.addWorksheet("VAT Summary", { properties: { tabColor: { argb: "FF065F46" } } });
  buildVatSummarySheet(vatSheet, opts.vatReport);

  // 8. Balance Sheet
  const bsSheet = wb.addWorksheet("Balance Sheet", { properties: { tabColor: { argb: "FF1F2937" } } });
  buildBalanceSheetSheet(bsSheet, opts.balanceSheet);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
