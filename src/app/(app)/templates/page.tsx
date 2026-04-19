import { PageHeader } from "@/components/app-shell/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const repository = await getRepository();
  const [workspace, currentUser] = await Promise.all([
    repository.getWorkspace(),
    repository.getCurrentUser(),
  ]);
  const viewerAccess = buildViewerAccessProfile(currentUser, workspace);
  if (!viewerAccess.canSeeTemplates) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        eyebrow="Templates"
        title="Build and save review table layouts"
        description="Start from the default columns, add derived columns with formulas, and save named templates. Saved templates appear in the template selector when reviewing any run."
      />
      <TemplateEditor />
    </>
  );
}
