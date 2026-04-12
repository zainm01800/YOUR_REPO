import { PageHeader } from "@/components/app-shell/page-header";
import { BankStatementImportForm } from "@/components/bank-statements/bank-statement-import-form";
import { getRepository } from "@/lib/data";

export default async function ImportBankStatementPage() {
  const repository = getRepository();
  const workspace = await repository.getWorkspace();

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
