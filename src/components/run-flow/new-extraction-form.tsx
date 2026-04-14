"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { AlertCircle, CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ClientExtractedDocumentInput } from "@/lib/domain/types";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function inferMimeType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function recogniseImageBatch(
  files: Array<{ fileName: string; mimeType: string; blob: Blob }>,
  onProgress: (message: string) => void,
) {
  if (files.length === 0) {
    return [] as ClientExtractedDocumentInput[];
  }

  onProgress(`Preparing OCR for ${files.length} image file${files.length > 1 ? "s" : ""}...`);
  const worker = await createWorker("eng");

  try {
    const extracted: ClientExtractedDocumentInput[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      onProgress(`Reading ${file.fileName} (${index + 1}/${files.length})...`);
      const result = await worker.recognize(file.blob);
      const rawText = result.data.text || "";
      const conf = typeof result.data.confidence === "number" ? result.data.confidence / 100 : 0.68;
      extracted.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        rawExtractedText: rawText,
        source: "browser_tesseract",
        confidence: conf,
      });
    }

    return extracted;
  } finally {
    await worker.terminate();
  }
}

async function collectBrowserOcrDocuments(files: File[], onProgress: (message: string) => void) {
  const directImages = files
    .filter((file) => imageMimeTypes.has(file.type))
    .map((file) => ({
      fileName: file.name,
      mimeType: file.type,
      blob: file,
    }));

  const zipImageEntries: Array<{ fileName: string; mimeType: string; blob: Blob }> = [];

  for (const file of files.filter((entry) => entry.name.toLowerCase().endsWith(".zip"))) {
    onProgress(`Expanding ${file.name} in your browser...`);
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files).filter((entry) => !entry.dir);

    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".png") && !lower.endsWith(".webp")) {
        continue;
      }
      const blob = await entry.async("blob");
      zipImageEntries.push({
        fileName: entry.name,
        mimeType: inferMimeType(entry.name),
        blob,
      });
    }
  }

  return recogniseImageBatch([...directImages, ...zipImageEntries], onProgress);
}

export function NewExtractionForm() {
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [isPending, setIsPending] = useState(false);

  function setOcrMessage(text: string | null) {
    if (text === null) { setStatusMessage(null); return; }
    setStatusMessage({ text, type: "info" });
  }
  function setErrorMessage(text: string) { setStatusMessage({ text, type: "error" }); }

  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const selectedDocuments = formData
      .getAll("documentFiles")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (selectedDocuments.length === 0) {
      setErrorMessage("Please select at least one document or zip file.");
      return;
    }

    setIsPending(true);

    try {
      setOcrMessage("Checking if files can be OCR'd locally...");
      const clientExtractedDocuments = await collectBrowserOcrDocuments(selectedDocuments, setOcrMessage);

      // Force this run to be OCR only so it does not synthesize transactions
      formData.set("bankSourceMode", "ocr_only");
      formData.set("clientExtractedDocuments", JSON.stringify(clientExtractedDocuments));
      // Give it a default name
      formData.set("name", `OCR Extraction ${new Date().toISOString().split('T')[0]}`);

      setOcrMessage("Sending upload package and text to server for full extraction...");
      const response = await fetch("/api/runs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setErrorMessage(`Upload failed (HTTP ${response.status}).`);
        return;
      }

      const payload = (await response.json()) as { redirectTo: string };
      router.push(payload.redirectTo);
      router.refresh();
    } catch (err) {
      setErrorMessage(String(err));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto space-y-6 flex flex-col p-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <Upload className="h-5 w-5 text-[var(--color-accent)]" />
          Upload Documents
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Upload receipts, invoices, or a ZIP archive for automatic OCR extraction. No bank statement is required.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Receipts or documents</span>
          <Input
            name="documentFiles"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
          />
          <span className="text-xs leading-5 text-[var(--color-muted-foreground)] block">
            PDFs, images, or a ZIP archive.
          </span>
        </label>

        {statusMessage ? (
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            statusMessage.type === "error"
              ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
              : statusMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted-foreground)]"
          }`}>
            {statusMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <LoaderCircle className={`h-4 w-4 shrink-0 ${isPending ? "animate-spin" : ""}`} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={isPending}>
            {isPending ? "Extracting..." : "Start Extraction"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
