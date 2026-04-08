"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedDocument, ReviewRow } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function DocumentAttachmentPanel({
  runId,
  row,
  documents,
}: {
  runId: string;
  row: ReviewRow;
  documents: ExtractedDocument[];
}) {
  const router = useRouter();
  const [selectedDocumentId, setSelectedDocumentId] = useState(row.documentId || "");
  const [fileName, setFileName] = useState("");
  const [supplier, setSupplier] = useState(row.supplier);
  const [issueDate, setIssueDate] = useState(row.date || "");
  const [gross, setGross] = useState(row.gross?.toString() || "");
  const [net, setNet] = useState(row.net?.toString() || "");
  const [vat, setVat] = useState(row.vat?.toString() || "");
  const [currency, setCurrency] = useState(row.currency);
  const [rawText, setRawText] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedDocument = useMemo(
    () => documents.find((candidate) => candidate.id === row.documentId),
    [documents, row.documentId],
  );

  async function updateDocumentLink() {
    const newDocument =
      fileName.trim().length > 0
        ? {
            fileName,
            supplier,
            issueDate,
            gross: parseOptionalNumber(gross),
            net: parseOptionalNumber(net),
            vat: parseOptionalNumber(vat),
            currency,
            rawExtractedText: rawText,
          }
        : undefined;

    await fetch(`/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        rowId: row.id,
        actionType: "rematch",
        payload: {
          documentId: newDocument ? undefined : selectedDocumentId || undefined,
          newDocument,
        },
      }),
    });
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Attached documents</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Pick one of the documents already in this run, or add a new document and apply it to the selected row when you are ready.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Available in this run
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedDocumentId(document.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                selectedDocumentId === document.id
                  ? "border-[var(--color-accent)] bg-white"
                  : "border-[var(--color-border)] bg-white/70 hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-[var(--color-foreground)]">
                {document.fileName}
              </div>
              <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {document.supplier || "Unknown supplier"} · {formatDate(document.issueDate)}
              </div>
              <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {formatCurrency(document.gross || 0, document.currency)} · {Math.round(document.confidence * 100)}% confidence
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Currently linked
        </div>
        <div className="mt-2 text-sm text-[var(--color-foreground)]">
          {linkedDocument ? linkedDocument.fileName : "No document linked"}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Add a new document
        </div>
        <div className="grid gap-3">
          <Input
            placeholder="Document file name"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
          <Input
            placeholder="Supplier"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          />
          <Input
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Gross"
              value={gross}
              onChange={(event) => setGross(event.target.value)}
            />
            <Input
              placeholder="Net"
              value={net}
              onChange={(event) => setNet(event.target.value)}
            />
            <Input
              placeholder="VAT"
              value={vat}
              onChange={(event) => setVat(event.target.value)}
            />
          </div>
          <Input
            placeholder="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <Input
            placeholder="Optional extracted text note"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />
        </div>
      </div>

      <Button
        type="button"
        disabled={pending || (!selectedDocumentId && !fileName.trim())}
        onClick={() =>
          startTransition(async () => {
            await updateDocumentLink();
          })
        }
      >
        Update linked document
      </Button>
    </Card>
  );
}
