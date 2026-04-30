"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { FileUp, LoaderCircle, Upload } from "lucide-react";
import type { ExtractedDocument, ReviewRow } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ReviewMutationResult } from "@/lib/data/repository";

type PendingDocument = ExtractedDocument & {
  clientId: string;
};

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedUploadExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".zip"];

function inferMimeType(fileName: string, mimeType?: string) {
  if (mimeType) {
    return mimeType;
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function isSupportedDocument(fileName: string) {
  const lower = fileName.toLowerCase();
  return supportedUploadExtensions.some((extension) => lower.endsWith(extension));
}

async function normaliseFiles(files: File[]) {
  const expandedFiles: Array<{ fileName: string; mimeType: string; blob: Blob }> = [];

  for (const file of files) {
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries = Object.values(zip.files).filter((entry) => !entry.dir);

      for (const entry of entries) {
        if (!isSupportedDocument(entry.name) || entry.name.toLowerCase().endsWith(".zip")) {
          continue;
        }

        const blob = await entry.async("blob");
        expandedFiles.push({
          fileName: entry.name,
          mimeType: inferMimeType(entry.name),
          blob,
        });
      }

      continue;
    }

    expandedFiles.push({
      fileName: file.name,
      mimeType: inferMimeType(file.name, file.type || undefined),
      blob: file,
    });
  }

  return expandedFiles;
}

async function extractDocumentFromClientText(input: {
  fileName: string;
  mimeType: string;
  rawExtractedText: string;
  confidence?: number;
}) {
  const formData = new FormData();
  formData.append("fileName", input.fileName);
  formData.append("mimeType", input.mimeType);
  formData.append("rawExtractedText", input.rawExtractedText);
  if (typeof input.confidence === "number") {
    formData.append("confidence", String(input.confidence));
  }

  const response = await fetch("/api/ai/extract-document", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Client extraction failed.");
  }

  return (await response.json()) as ExtractedDocument;
}

async function extractDocumentFromFile(file: {
  fileName: string;
  mimeType: string;
  blob: Blob;
}) {
  const formData = new FormData();
  formData.append(
    "file",
    new File([file.blob], file.fileName, { type: file.mimeType }),
  );

  const response = await fetch("/api/ai/extract-document", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Server extraction failed.");
  }

  return (await response.json()) as ExtractedDocument;
}

async function extractPendingDocuments(
  files: File[],
  onProgress: (message: string) => void,
) {
  const normalisedFiles = await normaliseFiles(files);
  if (normalisedFiles.length === 0) {
    return [] as PendingDocument[];
  }

  const images = normalisedFiles.filter((file) => imageMimeTypes.has(file.mimeType));
  const nonImages = normalisedFiles.filter((file) => !imageMimeTypes.has(file.mimeType));
  const pendingDocuments: PendingDocument[] = [];

  if (images.length > 0) {
    onProgress(`Preparing OCR for ${images.length} image file${images.length > 1 ? "s" : ""}...`);
    const worker = await createWorker("eng");

    try {
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        onProgress(`Reading ${image.fileName} (${index + 1}/${normalisedFiles.length}) on this device...`);
        const result = await worker.recognize(image.blob);
        const extracted = await extractDocumentFromClientText({
          fileName: image.fileName,
          mimeType: image.mimeType,
          rawExtractedText: result.data.text || "",
          confidence:
            typeof result.data.confidence === "number"
              ? result.data.confidence / 100
              : 0.68,
        });
        pendingDocuments.push({
          ...extracted,
          clientId: `pending_${Date.now()}_${index}_${image.fileName}`,
        });
      }
    } finally {
      await worker.terminate();
    }
  }

  for (let index = 0; index < nonImages.length; index += 1) {
    const file = nonImages[index];
    onProgress(`Extracting ${file.fileName} (${images.length + index + 1}/${normalisedFiles.length})...`);
    const extracted = await extractDocumentFromFile(file);
    pendingDocuments.push({
      ...extracted,
      clientId: `pending_${Date.now()}_${images.length + index}_${file.fileName}`,
    });
  }

  return pendingDocuments;
}

export function DocumentAttachmentPanel({
  runId,
  row,
  rows,
  documents,
  onSelectRow,
  onDocumentLinked,
}: {
  runId: string;
  row: ReviewRow;
  rows: ReviewRow[];
  documents: ExtractedDocument[];
  onSelectRow: (rowId: string) => void;
  onDocumentLinked?: (payload: {
    linkedDocumentId?: string;
    updatedRows: ReviewRow[];
    updatedDocuments: ExtractedDocument[];
    affectedTransactionIds?: string[];
  }) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(row.documentId || "");
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [selectedPendingDocumentId, setSelectedPendingDocumentId] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const linkedDocument = useMemo(
    () => documents.find((candidate) => candidate.id === row.documentId),
    [documents, row.documentId],
  );

  function handleDocumentClick(documentId: string) {
    setSelectedDocumentId(documentId);
    setSelectedPendingDocumentId("");
    const linkedRow = rows.find((candidate) => candidate.documentId === documentId);
    if (linkedRow && linkedRow.id !== row.id) {
      onSelectRow(linkedRow.id);
    }
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setExtracting(true);
    setExtractMessage(`Extracting ${files.length} file${files.length > 1 ? "s" : ""}...`);

    try {
      const extractedDocuments = await extractPendingDocuments(files, setExtractMessage);
      setPendingDocuments((current) => [...current, ...extractedDocuments]);
      setSelectedPendingDocumentId(
        extractedDocuments[0]?.clientId || selectedPendingDocumentId,
      );
      setSelectedDocumentId("");

      if (extractedDocuments.length > 0) {
        setExtractMessage(
          `Extracted ${extractedDocuments.length} document${extractedDocuments.length > 1 ? "s" : ""}. Select one to link, or keep all and update the row.`,
        );
      } else {
        setExtractMessage("No supported files were found in that upload.");
      }
    } catch {
      setExtractMessage("Could not extract one or more documents from that upload.");
    } finally {
      setExtracting(false);
    }
  }

  async function updateDocumentLink(createTransactionFromDocument = false) {
    const selectedPendingDocument =
      pendingDocuments.find((document) => document.clientId === selectedPendingDocumentId) ||
      pendingDocuments[0];
    const linkedExistingDocument = documents.find(
      (document) => document.id === selectedDocumentId,
    );
    const linkedDocument = selectedPendingDocument || linkedExistingDocument;

    const response = await fetch(`/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        rowId: row.id,
        actionType: "rematch",
        payload: {
          documentId: pendingDocuments.length === 0 ? selectedDocumentId || undefined : undefined,
          selectedUploadedDocumentId:
            pendingDocuments.length > 0
              ? selectedPendingDocumentId || pendingDocuments[0]?.clientId
              : undefined,
          createTransactionFromDocument,
          newDocuments: pendingDocuments.map((document) => ({
            clientId: document.clientId,
            fileName: document.fileName,
            supplier: document.supplier,
            issueDate: document.issueDate,
            gross: document.gross,
            net: document.net,
            vat: document.vat,
            currency: document.currency,
            rawExtractedText: document.rawExtractedText,
            confidence: document.confidence,
            taxLines: document.taxLines.map((taxLine) => ({
              label: taxLine.label,
              netAmount: taxLine.netAmount,
              taxAmount: taxLine.taxAmount,
              grossAmount: taxLine.grossAmount,
              rate: taxLine.rate,
              recoverable: taxLine.recoverable,
              vatCode: taxLine.vatCode,
            })),
          })),
        },
      }),
    });
    if (!response.ok) {
      setExtractMessage("Could not update the linked document. Please try again.");
      return;
    }

    const payload = (await response.json()) as {
      ok: boolean;
      mutation?: ReviewMutationResult;
      run?: { documents?: ExtractedDocument[] } | null;
      rows?: ReviewRow[];
    };

    const updatedDocuments = payload.run?.documents || documents;
    const updatedRows = payload.rows || rows;
    const nextLinkedDocumentId =
      payload.mutation?.linkedDocumentId ||
      linkedDocument?.id;

    onDocumentLinked?.({
      linkedDocumentId: nextLinkedDocumentId,
      updatedRows,
      updatedDocuments,
      affectedTransactionIds: payload.mutation?.affectedTransactionIds,
    });
    setPendingDocuments([]);
    setSelectedPendingDocumentId("");
    setSelectedDocumentId(nextLinkedDocumentId || "");
    setExtractMessage(
      createTransactionFromDocument
        ? "Created a new transaction from the selected document."
        : nextLinkedDocumentId
          ? `Linked ${pendingDocuments.length > 0 ? "the uploaded document" : "the selected document"} to the current transaction.`
          : "Uploaded documents were added to the run and left unmatched.",
    );
    router.refresh();
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Attached documents</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Pick an existing document, or drag in PDFs, images, or ZIPs and Zentra will extract the details automatically.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Available in this run
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
          {documents.map((document) => {
            const linkedToRow = rows.find((candidate) => candidate.documentId === document.id);
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
                      {"->"} {linkedToRow.supplier}
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
          Upload new documents
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
                New uploads are added to the run as documents. By default, Zentra links the selected
          document to the current transaction rather than creating duplicate spend.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const droppedFiles = Array.from(event.dataTransfer.files || []);
            void handleFiles(droppedFiles);
          }}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 text-sm transition ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted-foreground)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          }`}
        >
          {extracting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : isDragging ? (
            <FileUp className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>
            {extracting
              ? "Extracting documents..."
              : isDragging
                ? "Drop files to extract them"
                : "Click or drag PDF, image, or ZIP files here"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
          className="hidden"
          onChange={(event) => void handleFiles(Array.from(event.target.files || []))}
        />

        {extractMessage ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">{extractMessage}</p>
        ) : null}

        {pendingDocuments.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Extracted from this upload
            </div>
            {pendingDocuments.map((document) => (
              <button
                key={document.clientId}
                type="button"
                onClick={() => setSelectedPendingDocumentId(document.clientId)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedPendingDocumentId === document.clientId
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
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          disabled={
            pending ||
            extracting ||
            (pendingDocuments.length === 0 && !selectedDocumentId)
          }
          onClick={() =>
            startTransition(async () => {
              await updateDocumentLink(false);
            })
          }
          className="flex-1"
        >
          Link to current transaction
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={
            pending ||
            extracting ||
            (pendingDocuments.length === 0 && !selectedDocumentId)
          }
          onClick={() =>
            startTransition(async () => {
              await updateDocumentLink(true);
            })
          }
          className="flex-1"
        >
          Create new transaction
        </Button>
      </div>
    </Card>
  );
}
