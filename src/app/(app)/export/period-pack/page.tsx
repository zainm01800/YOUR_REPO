import { PageHeader } from "@/components/app-shell/page-header";
import { PeriodExportPack } from "@/components/export/period-export-pack";
import { getRepository } from "@/lib/data";

export default async function PeriodExportPage() {
  const repository = await getRepository();
  const [settingsSnapshot, runs] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getRunsWithTransactions(),
  ]);

  // Collect available periods from runs
  const periodOptions = Array.from(
    new Set(
      runs
        .map((run) => run.period)
        .filter((p): p is string => Boolean(p)),
    ),
  ).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <PageHeader
        eyebrow="Export & Output"
        title="Period Export Pack"
        description="Download a complete multi-sheet Excel workbook for any period — P&L, Tax Summary, Transactions, Reconciliation, VAT, and Balance Sheet in one file."
      />
      <PeriodExportPack
        periodOptions={periodOptions}
        workspaceName={settingsSnapshot.workspace.name}
        currency={settingsSnapshot.workspace.defaultCurrency}
        vatRegistered={settingsSnapshot.workspace.vatRegistered}
      />
    </>
  );
}
