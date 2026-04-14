import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ExtractionsTable } from "@/components/runs/extractions-table";
import { getRepository } from "@/lib/data";

export default async function OcrExtractionsPage() {
  const repository = await getRepository();
  const allRuns = await repository.getRunSummaries();
  const runs = allRuns.filter(r => r.bankSourceMode === "ocr_only");

  return (
    <>
      <PageHeader
        eyebrow="Extraction Tool"
        title="All Extractions"
        description="Review past document OCR extraction jobs."
        actions={
          <Link href="/ocr-extraction/new">
            <Button>New Extraction</Button>
          </Link>
        }
      />

      <ExtractionsTable runs={runs} />
    </>
  );
}
