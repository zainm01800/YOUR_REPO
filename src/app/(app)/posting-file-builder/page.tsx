import { PageHeader } from "@/components/app-shell/page-header";
import { PostingFileBuilder } from "@/components/posting-file-builder/posting-file-builder";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Posting File Builder" };

export default async function PostingFileBuilderPage() {
  const { repository, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canSeePostingBuilder) {
    redirect("/export/period-pack");
  }
  const runs = await repository.getRunsWithTransactions();

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
