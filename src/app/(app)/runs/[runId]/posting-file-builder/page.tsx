import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { PostingFileBuilder } from "@/components/export/posting-file-builder";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";

export default async function PostingFileBuilderPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const repository = await getRepository();
  const [run, workspace, currentUser] = await Promise.all([
    repository.getRun(runId),
    repository.getWorkspace(),
    repository.getCurrentUser(),
  ]);
  const viewerAccess = buildViewerAccessProfile(currentUser, workspace);
  if (!viewerAccess.canSeePostingBuilder) {
    redirect(`/runs/${runId}/export`);
  }

  if (!run) {
    notFound();
  }

  const rows = await repository.getRunRows(runId);

  return (
    <>
      <PageHeader
        eyebrow="Posting file builder"
        title="Generate a filled ERP workbook from this run"
        description="Upload a posting template workbook, map its columns to ClearMatch fields, and download a filled copy in the same workbook structure."
        actions={
          <Link href={`/runs/${run.id}/export`}>
            <Button variant="secondary">Back to export</Button>
          </Link>
        }
      />

      <PostingFileBuilder runId={run.id} rows={rows} />
    </>
  );
}
