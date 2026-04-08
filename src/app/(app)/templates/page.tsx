import { PageHeader } from "@/components/app-shell/page-header";
import { TemplateEditor } from "@/components/templates/template-editor";

export default function TemplatesPage() {
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
