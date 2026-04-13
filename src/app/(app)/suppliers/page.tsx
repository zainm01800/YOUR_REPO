import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { formatCurrency } from "@/lib/utils";

export default async function SupplierAnalysisPage() {
  const repository = getRepository();
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

      <Card className="overflow-hidden p-0">
        {suppliers.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
            No supplier data yet. Process a run first to populate this view.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3 text-right">Total spend</th>
                <th className="px-6 py-3 text-right">Total VAT</th>
                <th className="px-6 py-3 text-right">Avg VAT %</th>
                <th className="px-6 py-3 text-right">Rows</th>
                <th className="px-6 py-3 text-right">Exception rows</th>
                <th className="px-6 py-3">Top GL codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {suppliers.map((supplier) => (
                <tr key={supplier.supplier} className="hover:bg-[var(--color-panel)]">
                  <td className="px-6 py-4 font-semibold text-[var(--color-foreground)]">
                    {supplier.supplier}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {formatCurrency(supplier.totalSpend, currency)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {formatCurrency(supplier.totalVat, currency)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {supplier.avgVatRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">{supplier.rowCount}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{supplier.exceptions}</td>
                  <td className="px-6 py-4 text-[var(--color-muted-foreground)]">
                    {supplier.topGlCodes || "None yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
