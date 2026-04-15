import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export default async function SupplierAnalysisPage() {
  const repository = await getRepository();
  const [settingsSnapshot, runs] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
  ]);
  const currency = settingsSnapshot.workspace.defaultCurrency ?? "GBP";
  const runRows = runs.map((run) => ({
    run,
    rows: buildReviewRows(run, settingsSnapshot.vatRules, settingsSnapshot.glRules, settingsSnapshot.categoryRules),
  }));

  const supplierStats = new Map<
    string,
    {
      supplier: string;
      totalSpend: number;
      totalVat: number;
      avgVatRate: number;
      vatRateSamples: number;
      glCodes: Map<string, number>;
      exceptions: number;
      rowCount: number;
    }
  >();

  for (const { rows } of runRows) {
    for (const row of rows) {
      const supplier = row.supplier || "Unknown supplier";
      const current = supplierStats.get(supplier) || {
        supplier,
        totalSpend: 0,
        totalVat: 0,
        avgVatRate: 0,
        vatRateSamples: 0,
        glCodes: new Map<string, number>(),
        exceptions: 0,
        rowCount: 0,
      };

      current.totalSpend += row.grossInRunCurrency ?? row.gross ?? 0;
      current.totalVat += row.vatInRunCurrency ?? row.vat ?? 0;
      if (row.vatPercent !== undefined) {
        current.avgVatRate += row.vatPercent;
        current.vatRateSamples += 1;
      }
      if (row.glCode) {
        current.glCodes.set(row.glCode, (current.glCodes.get(row.glCode) || 0) + 1);
      }
      if (row.exceptions.length > 0) {
        current.exceptions += 1;
      }
      current.rowCount += 1;
      supplierStats.set(supplier, current);
    }
  }

  const suppliers = Array.from(supplierStats.values())
    .map((supplier) => ({
      ...supplier,
      avgVatRate:
        supplier.vatRateSamples > 0
          ? Number((supplier.avgVatRate / supplier.vatRateSamples).toFixed(1))
          : 0,
      topGlCodes: Array.from(supplier.glCodes.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([code, count]) => `${code} (${count})`)
        .join(", "),
    }))
    .sort((left, right) => right.totalSpend - left.totalSpend);

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Supplier spend analysis"
        description="See who you spend the most with, how often they generate exceptions, and which GL codes are being used most often."
      />

      <SuppliersTable suppliers={suppliers} currency={currency} />
    </>
  );
}
