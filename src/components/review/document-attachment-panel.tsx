"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, LoaderCircle } from "lucide-react";
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
  rows,
  documents,
  onSelectRow,
}: {
  runId: string;
  row: ReviewRow;
  rows: ReviewRow[];
  documents: ExtractedDocument[];
  onSelectRow: (rowId: string) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(row.documentId || "");
  const [fileName, setFileName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [gross, setGross] = useState("");
  const [net, setNet] = useState("");
  const [vat, setVat] = useState("");
  const [currency, setCurrency] = useState(row.currency);
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linkedDocument = useMemo(
    () => documents.find((candidate) => candidate.id === row.documentId),
    [documents, row.documentId],
  );

  function handleDocumentClick(documentId: string) {
    setSelectedDocumentId(documentId);
    const linkedRow = rows.find((r) => r.documentId === documentId);
    if (linkedRow && linkedRow.id !== row.id) {
      onSelectRow(linkedRow.id);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    setExtractMessage(`Extracting data from ${file.name}…`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/extract-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setExtractMessage("Extraction failed — fill in the fields manually.");
        return;
      }

      const extracted = await response.json();
      setFileName(extracted.fileName || file.name);
      setSupplier(extracted.supplier || "");
      setIssueDate(extracted.issueDate || "");
      setGross(extracted.gross?.toString() || "");
      setNet(extracted.net?.toString() || "");
      setVat(extracted.vat?.toString() || "");
      setCurrency(extracted.currency || row.currency);
      setRawText(extracted.rawExtractedText || "");
      setExtractMessage(
        `Extracted: ${extracted.supplier || file.name} · ${Math.round((extracted.confidence || 0) * 100)}% confidence`,
      );
    } catch {
      setExtractMessage("Could not reach extraction service.");
    } finally {
      setExtracting(false);
    }
  }

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
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Attached documents</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Pick a document to see its linked row, or upload a new file and AI will extract the data automatically.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Available in this run
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
          {documents.map((document) => {
            const linkedToRow = rows.find((r) => r.documentId === document.id);
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => handleDocumentClick(document.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
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
                  {linkedToRow ? (
                    <span className="ml-2 rounded-md bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-medium text-[var(--color-accent)]">
                      → {linkedToRow.supplier}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
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

      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Upload a new document
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-5 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
        >
          {extracting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{extracting ? "Extracting…" : "Click to upload PDF, image, or ZIP"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
          className="hidden"
          onChange={handleFileUpload}
        />

        {extractMessage ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">{extractMessage}</p>
        ) : null}

        {fileName ? (
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
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        disabled={pending || extracting || (!selectedDocumentId && !fileName.trim())}
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
