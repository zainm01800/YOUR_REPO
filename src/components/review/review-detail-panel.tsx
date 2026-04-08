"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const document = run.documents.find((candidate) => candidate.id === row.documentId);
  const transaction = run.transactions.find(
    (candidate) => candidate.id === row.transactionId,
  );

  async function handleExplain() {
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: row.supplier,
          exceptions: row.exceptions,
          gross: row.gross,
          net: row.net,
          vat: row.vat,
          vatCode: row.vatCode,
          glCode: row.glCode,
          currency: row.currency,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? data.error ?? "No explanation returned.");
    } catch {
      setExplanation("Failed to reach AI service.");
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Transaction detail
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
            {transaction?.merchant || row.supplier}
          </h3>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Amount</dt>
            <dd className="mt-1 font-semibold">
              {formatCurrency(transaction?.amount || row.gross || 0, transaction?.currency || row.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Date</dt>
            <dd className="mt-1 font-semibold">
              {formatDate(transaction?.transactionDate || row.date)}
            </dd>
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

      {row.exceptions.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Exceptions
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                {row.exceptions.length} flag{row.exceptions.length !== 1 ? "s" : ""}
              </h3>
            </div>
            <button
              type="button"
              disabled={explaining}
              onClick={handleExplain}
              className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {explaining ? "Explaining…" : "Explain with AI"}
            </button>
          </div>
          <div className="space-y-2">
            {row.exceptions.map((ex, i) => (
              <div key={i} className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm">
                <div className="font-semibold text-[var(--color-foreground)]">{ex.code.replace(/_/g, " ")}</div>
                <div className="mt-0.5 text-[var(--color-muted-foreground)]">{ex.message}</div>
              </div>
            ))}
          </div>
          {explanation && (
            <div className="rounded-2xl border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] p-4 text-sm leading-6 text-[var(--color-foreground)]">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3" />
                AI explanation
              </div>
              {explanation}
            </div>
          )}
        </Card>
      )}

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
                <dd className="mt-1 font-semibold">{row.supplier}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Issue date</dt>
                <dd className="mt-1 font-semibold">{formatDate(row.date || document.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Gross</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(row.gross ?? document.gross ?? 0, row.currency || document.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">VAT</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(row.vat ?? document.vat ?? 0, row.currency || document.currency)}
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
