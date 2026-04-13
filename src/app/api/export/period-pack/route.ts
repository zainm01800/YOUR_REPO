import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import {
  buildPnL,
  buildVatReport,
  buildBalanceSheet,
  buildUncategorisedList,
} from "@/lib/accounting/reports";
import { buildTaxSummaryReport } from "@/lib/accounting/tax-summary";
import { resolveCategory } from "@/lib/categories/suggester";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildPeriodExportWorkbook } from "@/lib/export/period-export";
import type { ClassifiedTransaction } from "@/lib/accounting/classifier";
import type { ReviewRow } from "@/lib/domain/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") ?? "all";
    const includeDraft = searchParams.get("includeDraft") === "true";

    const repository = await getRepository();
    const [settingsSnapshot, runs, unassignedBankTxns] = await Promise.all([
      repository.getSettingsSnapshot(),
      repository.getRunsWithTransactions(),
      repository.getUnassignedBankTransactions().catch(() => []),
    ]);

    const workspace = settingsSnapshot.workspace;
    const categoryRuleMap = buildCategoryRuleMap(settingsSnapshot.categoryRules);

    // ── Filter runs by period ────────────────────────────────────────────────
    const filteredRuns = period === "all"
      ? runs
      : runs.filter((run) => run.period === period);

    // ── Classify transactions ────────────────────────────────────────────────
    const allTransactions: ClassifiedTransaction[] = [];
    const reconRows: ReviewRow[] = [];
    const runsForExport = filteredRuns.filter((run) => {
      if (!includeDraft) {
        return run.status === "completed" || run.status === "exported" || run.status === "review_required";
      }
      return run.status !== "failed";
    });

    for (const run of runsForExport) {
      for (const tx of run.transactions) {
        const resolvedCategoryName =
          tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
        const resolvedCategory = resolvedCategoryName
          ? categoryRuleMap.get(resolvedCategoryName)
          : undefined;
        allTransactions.push(
          classifyTransaction(tx, resolvedCategory, workspace.vatRegistered),
        );
      }

      // Build reconciliation rows for each run
      try {
        const rows = buildReviewRows(
          run,
          settingsSnapshot.vatRules,
          settingsSnapshot.glRules,
          settingsSnapshot.categoryRules,
        );
        reconRows.push(...rows);
      } catch {
        // skip — run may not have full reconciliation data
      }
    }

    // Include unassigned bank transactions (period-filtered by date if period is not "all")
    for (const tx of unassignedBankTxns) {
      if (period !== "all" && tx.transactionDate) {
        const txPeriod = tx.transactionDate.slice(0, 7); // YYYY-MM
        if (txPeriod !== period) continue;
      }
      if (!includeDraft) continue; // unassigned = draft by definition
      const resolvedCategoryName = tx.category ?? resolveCategory(tx, settingsSnapshot.categoryRules);
      const resolvedCategory = resolvedCategoryName
        ? categoryRuleMap.get(resolvedCategoryName)
        : undefined;
      allTransactions.push(
        classifyTransaction(tx, resolvedCategory, workspace.vatRegistered),
      );
    }

    // ── Build reports ────────────────────────────────────────────────────────
    const pnl = buildPnL(allTransactions, workspace.defaultCurrency);
    const vatReport = buildVatReport(allTransactions, workspace.defaultCurrency, workspace.vatRegistered);
    const balanceSheet = buildBalanceSheet(allTransactions, workspace.defaultCurrency);
    const taxSummary = buildTaxSummaryReport({
      pnl,
      vatReport,
      businessType: workspace.businessType,
      currency: workspace.defaultCurrency,
      classifiedTransactions: allTransactions,
    });

    const uncategorised = buildUncategorisedList(allTransactions);
    const unmatchedClassified = allTransactions.filter((tx) => tx.category === "Uncategorised");

    // Needs-review rows: mismatches or review_required status rows
    const needsReviewRows = reconRows.filter(
      (row) =>
        row.grossComparisonStatus === "mismatch" ||
        row.grossComparisonStatus === "missing_document",
    );

    // ── Build workbook ───────────────────────────────────────────────────────
    const buf = await buildPeriodExportWorkbook({
      workspaceName: workspace.name,
      period: period === "all" ? "All periods" : period,
      includeDraft,
      currency: workspace.defaultCurrency,
      pnl,
      taxSummary,
      vatReport,
      balanceSheet,
      allTransactions,
      reconciliationRows: reconRows,
      unmatchedTransactions: unmatchedClassified,
      needsReviewRows,
      runs: runsForExport.map((r) => ({
        id: r.id,
        name: r.name,
        period: r.period,
        status: r.status,
      })),
    });

    const periodLabel = period === "all" ? "all-periods" : period;
    const draftLabel = includeDraft ? "-with-drafts" : "-confirmed";
    const fileName = `period-pack-${periodLabel}${draftLabel}.xlsx`;

    return new Response(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Period Export] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate export pack", detail: String(error) },
      { status: 500 },
    );
  }
}
