import { PageHeader } from "@/components/app-shell/page-header";
import { NewExtractionForm } from "@/components/run-flow/new-extraction-form";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export const metadata = {
  title: "New Extraction",
};

export default async function NewOcrExtractionPage() {
  const { viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canManageOperationalData) {
    redirect("/ocr-extraction");
  }

  return (
    <>
      <PageHeader
        eyebrow="OCR Extraction"
        title="OCR Document Extraction"
        description="Upload documents to extract data from them. No bank statement required."
      />
      <div className="mt-8">
        <NewExtractionForm />
      </div>
    </>
  );
}
