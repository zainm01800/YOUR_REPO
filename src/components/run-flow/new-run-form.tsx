"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import { AlertCircle, CheckCircle2, LoaderCircle, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type {
  BankStatement,
  ClientExtractedDocumentInput,
  MappingTemplate,
  RunSetupPreset,
  Workspace,
} from "@/lib/domain/types";
import {
  europeanCountryOptions,
  getDefaultCurrencyForCountry,
  runPresetStorageKey,
  supportedCurrencies,
} from "@/lib/run-config";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

interface RunFormValues {
  name: string;
  entity: string;
  defaultCurrency: string;
  countryProfile: string;
  templateId: string;
  notes: string;
}

const initialPresetName = "";

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
      const rawText = result.data.text || "";
      const conf = typeof result.data.confidence === "number" ? result.data.confidence / 100 : 0.68;
      console.log(`[OCR] ${file.fileName} | conf=${conf.toFixed(2)} | chars=${rawText.length}`);
      console.log(`[OCR] text:\n${rawText.slice(0, 800)}`);
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
      if (
        !lower.endsWith(".jpg") &&
        !lower.endsWith(".jpeg") &&
        !lower.endsWith(".png") &&
        !lower.endsWith(".webp")
      ) {
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

function readPresetsFromStorage() {
  if (typeof window === "undefined") {
    return [] as RunSetupPreset[];
  }

  try {
    const stored = window.localStorage.getItem(runPresetStorageKey);
    if (!stored) {
      return [];
    }

    return JSON.parse(stored) as RunSetupPreset[];
  } catch {
    return [];
  }
}

function writePresetsToStorage(presets: RunSetupPreset[]) {
  window.localStorage.setItem(runPresetStorageKey, JSON.stringify(presets));
}

function buildInitialValues(
  workspace: Workspace,
  templates: MappingTemplate[],
): RunFormValues {
  return {
    name: "",
    entity: "",
    defaultCurrency: workspace.defaultCurrency,
    countryProfile: workspace.countryProfile,
    templateId: templates[0]?.id || "",
    notes: "",
  };
}

export function NewRunForm({
  workspace,
  templates,
  bankStatements,
}: {
  workspace: Workspace;
  templates: MappingTemplate[];
  bankStatements: BankStatement[];
}) {
  const initialValues = useMemo(
    () => buildInitialValues(workspace, templates),
    [templates, workspace],
  );
  const [values, setValues] = useState<RunFormValues>(initialValues);
  const [presets, setPresets] = useState<RunSetupPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetName, setPresetName] = useState(initialPresetName);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [bankSourceMode, setBankSourceMode] = useState<"statement" | "all_unreconciled" | "skip" | "later">(
    bankStatements.length > 0 ? "all_unreconciled" : "skip",
  );
  const [selectedBankStatementId, setSelectedBankStatementId] = useState(bankStatements[0]?.id || "");

  function setOcrMessage(text: string | null) {
    if (text === null) { setStatusMessage(null); return; }
    setStatusMessage({ text, type: "info" });
  }
  function setSuccessMessage(text: string) { setStatusMessage({ text, type: "success" }); }
  function setErrorMessage(text: string) { setStatusMessage({ text, type: "error" }); }
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    setPresets(readPresetsFromStorage());
  }, []);

  function updateValue<K extends keyof RunFormValues>(key: K, value: RunFormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    setSelectedPresetId(preset.id);
    setValues((current) => ({
      ...current,
      entity: preset.entity || "",
      countryProfile: preset.countryProfile,
      defaultCurrency: preset.defaultCurrency,
      templateId: preset.templateId || current.templateId,
      notes: preset.notes || "",
    }));
    setSuccessMessage(`Loaded preset "${preset.name}".`);
  }

  function saveCurrentPreset() {
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      setErrorMessage("Enter a preset name before saving.");
      return;
    }

    const preset: RunSetupPreset = {
      id: `preset_${Date.now()}`,
      name: trimmedName,
      entity: values.entity,
      countryProfile: values.countryProfile,
      defaultCurrency: values.defaultCurrency,
      templateId: values.templateId || undefined,
      notes: values.notes,
    };

    const updatedPresets = [preset, ...presets];
    setPresets(updatedPresets);
    setSelectedPresetId(preset.id);
    setPresetName("");
    writePresetsToStorage(updatedPresets);
    setSuccessMessage(`Saved preset "${preset.name}".`);
  }

  function deleteSelectedPreset() {
    if (!selectedPresetId) {
      setErrorMessage("Choose a preset to delete first.");
      return;
    }

    const updatedPresets = presets.filter((preset) => preset.id !== selectedPresetId);
    setPresets(updatedPresets);
    setSelectedPresetId("");
    writePresetsToStorage(updatedPresets);
    setSuccessMessage("Deleted the selected preset.");
  }

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

      console.log("[submit] clientExtractedDocuments:", clientExtractedDocuments.map(d => ({
        fileName: d.fileName,
        chars: d.rawExtractedText?.length ?? 0,
        conf: d.confidence,
      })));

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
        let detail = "";
        try {
          const errBody = await response.json();
          detail = errBody.error ? ` (${errBody.error})` : "";
        } catch { /* ignore */ }
        setErrorMessage(`Upload failed (HTTP ${response.status})${detail}. Please try again.`);
        console.error("[new-run] Upload failed", response.status, detail);
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
    <Card className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
              Run presets
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Save entity, country, currency, template, and notes as reusable setup presets for recurring uploads.
            </p>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">Load preset</span>
            <Select
              value={selectedPresetId}
              onChange={(event) => applyPreset(event.target.value)}
            >
              <option value="">Choose a saved preset</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Save current options as preset</span>
            <Input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="e.g. Germany SaaS expenses"
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={saveCurrentPreset}>
              <Save className="mr-2 h-4 w-4" />
              Save preset
            </Button>
            <Button type="button" variant="danger" onClick={deleteSelectedPreset}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected
            </Button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-6"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Run name</span>
              <Input
                name="name"
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                placeholder="e.g. April 2026 card reconciliation"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Entity</span>
              <Input
                name="entity"
                value={values.entity}
                onChange={(event) => updateValue("entity", event.target.value)}
                placeholder="e.g. Acme Ltd"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Default currency</span>
              <Select
                name="defaultCurrency"
                value={values.defaultCurrency}
                onChange={(event) => updateValue("defaultCurrency", event.target.value)}
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Country / tax profile</span>
              <Select
                name="countryProfile"
                value={values.countryProfile}
                onChange={(event) => {
                  const nextCountry = event.target.value;
                  updateValue("countryProfile", nextCountry);
                  updateValue("defaultCurrency", getDefaultCurrencyForCountry(nextCountry));
                }}
              >
                {europeanCountryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium">Bank transaction source</span>
              <Select
                name="bankSourceMode"
                value={bankSourceMode}
                onChange={(event) =>
                  setBankSourceMode(
                    event.target.value as "statement" | "all_unreconciled" | "skip" | "later",
                  )
                }
              >
                {bankStatements.length > 0 ? (
                  <option value="statement">Use a specific imported bank statement</option>
                ) : null}
                <option value="all_unreconciled">Search all unreconciled bank transactions</option>
                <option value="skip">Skip for now</option>
                <option value="later">Choose later in review</option>
              </Select>
              <span className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                Reconciliation runs can now consume imported bank data without re-uploading the same statement every month.
              </span>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Imported bank statement</span>
              <Select
                name="bankStatementId"
                value={selectedBankStatementId}
                onChange={(event) => setSelectedBankStatementId(event.target.value)}
                disabled={bankSourceMode !== "statement"}
              >
                <option value="">Choose a bank statement</option>
                {bankStatements.map((statement) => (
                  <option key={statement.id} value={statement.id}>
                    {statement.name} · {statement.transactionCount} transactions
                  </option>
                ))}
              </Select>
              <div className="flex items-center justify-between text-xs leading-5 text-[var(--color-muted-foreground)]">
                <span>
                  {bankStatements.length > 0
                    ? `${bankStatements.length} imported statement${bankStatements.length === 1 ? "" : "s"} ready to reuse.`
                    : "No bank statements imported yet."}
                </span>
                <Link
                  href="/bank-statements/import"
                  className="font-semibold text-[var(--color-accent)]"
                >
                  Import one
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">One-off transaction file (optional)</span>
              <Input name="transactionFile" type="file" accept=".csv,.xlsx,.xls" />
              <span className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                Keep this for exceptional one-off imports. For repeat workflows, use the Bank Statements area instead.
              </span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Receipts or documents</span>
              <Input
                name="documentFiles"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
              />
              <span className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                PDFs, images, or a ZIP archive. OCR runs in the browser for images.
              </span>
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Mapping template</span>
              <Select
                name="templateId"
                value={values.templateId}
                onChange={(event) => updateValue("templateId", event.target.value)}
              >
                <option value="">No template</option>
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
                value={values.notes}
                onChange={(event) => updateValue("notes", event.target.value)}
                placeholder="Optional reminders for this run, entity, or reviewer."
              />
            </label>
          </div>

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
              {isPending ? "Preparing run..." : "Create run"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
