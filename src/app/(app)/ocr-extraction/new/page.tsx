import { PageHeader } from "@/components/app-shell/page-header";
import { NewExtractionForm } from "@/components/run-flow/new-extraction-form";

export const metadata = {
  title: "New Extraction",
};

export default function NewOcrExtractionPage() {
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
