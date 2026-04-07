import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReviewRow, ReconciliationRun } from "@/lib/domain/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ReviewDetailPanel({
  row,
  run,
}: {
  row: ReviewRow;
  run: ReconciliationRun;
}) {
  const document = run.documents.find((candidate) => candidate.id === row.documentId);
  const transaction = run.transactions.find(
    (candidate) => candidate.id === row.transactionId,
  );

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Transaction detail
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
            {transaction?.merchant}
          </h3>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Amount</dt>
            <dd className="mt-1 font-semibold">
              {formatCurrency(transaction?.amount || 0, transaction?.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Date</dt>
            <dd className="mt-1 font-semibold">{formatDate(transaction?.transactionDate)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Employee</dt>
            <dd className="mt-1 font-semibold">{transaction?.employee || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Reference</dt>
            <dd className="mt-1 font-semibold">{transaction?.reference || "None"}</dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Document preview
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
              {document?.fileName || "Missing receipt"}
            </h3>
          </div>
          {document ? <Badge tone="info">{Math.round(document.confidence * 100)}% OCR</Badge> : null}
        </div>
        {document ? (
          <>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Supplier</dt>
                <dd className="mt-1 font-semibold">{document.supplier}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Issue date</dt>
                <dd className="mt-1 font-semibold">{formatDate(document.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Gross</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(document.gross || 0, document.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">VAT</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(document.vat || 0, document.currency)}
                </dd>
              </div>
            </dl>
            <div className="rounded-2xl bg-[var(--color-panel)] p-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {document.rawExtractedText || "No raw text available for this preview."}
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            No document is currently matched to this transaction.
          </p>
        )}
      </Card>
    </div>
  );
}

