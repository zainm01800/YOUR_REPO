import { PageHeader } from "@/components/app-shell/page-header";
import { NewRunForm } from "@/components/run-flow/new-run-form";
import { getRepository } from "@/lib/data";

export default async function NewRunPage() {
  const repository = getRepository();
  const [workspace, templates] = await Promise.all([
    repository.getWorkspace(),
    repository.getTemplates(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="New Reconciliation Run"
        title="Upload transactions, receipts, and start a clean review flow"
        description="Use one upload flow for card exports, AP files, and receipt batches. Mapping and review come next."
      />

      <NewRunForm workspace={workspace} templates={templates} />
    </>
  );
}
