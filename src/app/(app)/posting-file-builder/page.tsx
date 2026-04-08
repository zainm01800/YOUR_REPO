import { PageHeader } from "@/components/app-shell/page-header";
import { PostingFileBuilder } from "@/components/posting-file-builder/posting-file-builder";
import { getRepository } from "@/lib/data";
import type { ReconciliationRun } from "@/lib/domain/types";

export default async function PostingFileBuilderPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();

  const runs = (
    await Promise.all(snapshot.runs.map((r) => repository.getRun(r.id)))
  ).filter((r): r is ReconciliationRun => r !== null);

  return (
    <>
      <PageHeader
        eyebrow="Posting File Builder"
        title="Transform reconciled data into upload-ready files"
        description="Select a completed reconciliation run, apply a saved output template, and download a file pre-filled with your mapped data — ready to post into SAP, Xero, Sage, or any ERP."
      />
      <PostingFileBuilder runs={runs} />
    </>
  );
}
