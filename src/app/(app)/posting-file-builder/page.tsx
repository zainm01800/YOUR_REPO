import { PageHeader } from "@/components/app-shell/page-header";
import { PostingFileBuilder } from "@/components/posting-file-builder/posting-file-builder";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";
import { resolveViewerUser } from "@/lib/auth/viewer-user";
import { redirect } from "next/navigation";

export default async function PostingFileBuilderPage() {
  const repository = await getRepository();
  const [runs, workspace, currentUser] = await Promise.all([
    repository.getRunsWithTransactions(),
    repository.getWorkspace(),
    repository.getCurrentUser(),
  ]);
  const viewerUser = await resolveViewerUser(currentUser);
  const viewerAccess = buildViewerAccessProfile(viewerUser, workspace);
  if (!viewerAccess.canSeePostingBuilder) {
    redirect("/export/period-pack");
  }

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
