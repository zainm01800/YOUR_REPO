import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

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
    <>
      <PageHeader
        eyebrow="OCR Extraction"
        title="Extraction Results"
        description="Review the extracted data from your uploaded documents."
      />
      
      <div className="mt-8 space-y-6 max-w-5xl">
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Extracted Documents</h3>
          </div>
          <div>
            {run.documents.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center px-6">
                No documents found or extraction is still processing.
              </p>
            ) : (
              <div className="w-full">
                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                  <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-left">File</th>
                      <th className="px-6 py-4 font-semibold text-left">Supplier</th>
                      <th className="px-6 py-4 font-semibold text-left">Issue Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Net</th>
                      <th className="px-6 py-4 font-semibold text-right">VAT</th>
                      <th className="px-6 py-4 font-semibold text-right">Gross</th>
                      <th className="px-6 py-4 font-semibold text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {run.documents.map((doc) => {
                      const currency = doc.currency || run.defaultCurrency || "GBP";
                      return (
                        <tr key={doc.id} className="transition hover:bg-[var(--color-panel)]">
                          <td className="px-6 py-5 font-medium text-[var(--color-foreground)] max-w-[200px] truncate" title={doc.fileName}>
                            {doc.fileName}
                          </td>
                          <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                            {doc.supplier || "-"}
                          </td>
                          <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                            {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-6 py-5 text-right tabular-nums">
                            {doc.net ? formatCurrency(Number(doc.net), currency) : "-"}
                          </td>
                          <td className="px-6 py-5 text-right tabular-nums">
                            {doc.vat ? formatCurrency(Number(doc.vat), currency) : "-"}
                          </td>
                          <td className="px-6 py-5 text-right font-semibold tabular-nums">
                            {doc.gross ? formatCurrency(Number(doc.gross), currency) : "-"}
                          </td>
                          <td className="px-6 py-5 text-right tabular-nums text-[var(--color-muted-foreground)]">
                            {doc.extractionConfidence 
                              ? `${(Number(doc.extractionConfidence) * 100).toFixed(0)}%`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
