import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Extraction Results",
};

export default async function OcrExtractionPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const repository = await getRepository();
  const run = await repository.getRunById(runId);

  if (!run || run.bankSourceMode !== "ocr_only") {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Extraction Results"
        description="Review the extracted data from your uploaded documents."
      />
      
      <div className="mt-8 space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Extracted Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {run.documents.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
                No documents found or extraction is still processing.
              </p>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[var(--color-panel)]">
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium text-[var(--color-foreground)] max-w-[200px] truncate" title={doc.fileName}>
                          {doc.fileName}
                        </TableCell>
                        <TableCell>{doc.supplier || "-"}</TableCell>
                        <TableCell>
                          {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.net ? formatCurrency(doc.net, doc.currency || run.defaultCurrency) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.vat ? formatCurrency(doc.vat, doc.currency || run.defaultCurrency) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {doc.gross ? formatCurrency(doc.gross, doc.currency || run.defaultCurrency) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.extractionConfidence 
                            ? `${(doc.extractionConfidence * 100).toFixed(0)}%`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
