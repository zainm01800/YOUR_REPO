import { PageHeader } from "@/components/app-shell/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export const metadata = { title: "Mapping Templates" };

export default async function TemplatesPage() {
  const { viewerAccess } = await getServerViewerAccess();
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
