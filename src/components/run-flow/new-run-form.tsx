"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type {
  ClientExtractedDocumentInput,
  MappingTemplate,
  Workspace,
} from "@/lib/domain/types";

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
      onProgress(`Reading ${file.fileName} (${index + 1}/${files.length}) on this device...`);
      const result = await worker.recognize(file.blob);
      extracted.push({
        fileName: file.fileName,
        mimeType: file.mimeType,
        rawExtractedText: result.data.text || "",
        source: "browser_tesseract",
        confidence: typeof result.data.confidence === "number" ? result.data.confidence / 100 : 0.68,
      });
    }

    return extracted;
  } finally {
    await worker.terminate();
  }
}

async function collectBrowserOcrDocuments(
  files: File[],
  onProgress: (message: string) => void,
) {
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

export function NewRunForm({
  workspace,
  templates,
}: {
  workspace: Workspace;
  templates: MappingTemplate[];
}) {
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
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

    setIsPending(true);

    try {
      setOcrMessage("Checking whether any uploaded images can be OCR'd locally...");
      const clientExtractedDocuments = await collectBrowserOcrDocuments(
        selectedDocuments,
        setOcrMessage,
      );

      formData.set(
        "clientExtractedDocuments",
        JSON.stringify(clientExtractedDocuments),
      );

      setOcrMessage("Sending upload package and extracted text to ClearMatch...");
      const response = await fetch("/api/runs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setOcrMessage("The upload failed. Please try again.");
        return;
      }

      const payload = (await response.json()) as { redirectTo: string };
      router.push(payload.redirectTo);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="space-y-6"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Run name</span>
            <Input name="name" defaultValue="April card reconciliation" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Entity</span>
            <Input name="entity" defaultValue="Northstar Holdings Ltd" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Default currency</span>
            <Input value={workspace.defaultCurrency} readOnly />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Country / tax profile</span>
            <Select name="countryProfile" defaultValue={workspace.countryProfile}>
              <option value="GB">United Kingdom</option>
              <option value="IE">Ireland</option>
              <option value="EU">EU general</option>
            </Select>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Transaction file</span>
            <Input name="transactionFile" type="file" accept=".csv,.xlsx,.xls" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Receipts or ZIP archive</span>
            <Input
              name="documentFiles"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
            />
            <span className="text-xs leading-5 text-[var(--color-muted-foreground)]">
              Image OCR runs in the user&apos;s browser with Tesseract. PDFs still use the server parser.
            </span>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Mapping template</span>
            <Select name="templateId" defaultValue={templates[0]?.id}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Notes</span>
            <Textarea
              name="notes"
              rows={4}
              placeholder="Optional reminders for this run, entity, or reviewer."
            />
          </label>
        </div>

        {ocrMessage ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            <LoaderCircle className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            <span>{ocrMessage}</span>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={isPending}>{isPending ? "Preparing run..." : "Create run"}</Button>
        </div>
      </form>
    </Card>
  );
}
