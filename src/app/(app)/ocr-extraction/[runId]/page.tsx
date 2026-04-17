import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { OcrReviewWorkspace } from "@/components/ocr/ocr-review-workspace";

export const metadata = {
  title: "Extraction Results",
};

export default async function OcrExtractionPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const repository = await getRepository();
  const run = await repository.getRun(runId);

  if (!run || run.bankSourceMode !== "ocr_only") {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      <PageHeader
        eyebrow="OCR Extraction"
        title="Extraction Results"
        description="Review and verify the data extracted from your uploaded documents."
      />
      
      <OcrReviewWorkspace run={run} />
    </div>
  );
}
