import { PageHeader } from "@/components/app-shell/page-header";
import { NewRunForm } from "@/components/run-flow/new-run-form";
import { getRepository } from "@/lib/data";

export default async function NewRunPage() {
  const repository = getRepository();
  const [workspace, templates, bankStatements] = await Promise.all([
    repository.getWorkspace(),
    repository.getTemplates(),
    repository.getBankStatements(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="New Reconciliation Run"
        title="Upload transactions, receipts, and start a clean review flow"
        description="Upload receipts or invoices, then choose which imported bank transactions to reconcile against. You can also start document-only and attach bank data later."
      />

      <NewRunForm workspace={workspace} templates={templates} bankStatements={bankStatements} />
    </>
  );
}
