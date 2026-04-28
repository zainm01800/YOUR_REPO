import { PageHeader } from "@/components/app-shell/page-header";
import { BankStatementImportForm } from "@/components/bank-statements/bank-statement-import-form";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export default async function ImportBankStatementPage() {
  const { workspace, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canManageOperationalData) {
    redirect("/bank-statements");
  }

  return (
    <>
      <PageHeader
        eyebrow="Bank Statements"
        title="Import a reusable statement source"
        description="Map a CSV or Excel export once, store the imported transactions centrally, and use them across future reconciliation runs."
      />
      <BankStatementImportForm defaultCurrency={workspace.defaultCurrency} />
    </>
  );
}
