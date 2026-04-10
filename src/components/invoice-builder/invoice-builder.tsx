"use client";

import { useRef, useState } from "react";
import { Download, Sparkles, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ReconciliationRun } from "@/lib/domain/types";

const SOURCE_FIELD_LABELS: Record<string, string> = {
  supplier: "Supplier",
  date: "Date",
  currency: "Currency",
  originalAmount: "Original Amount",
  gross: "Gross",
  net: "Net",
  vat: "VAT Amount",
  vatPercent: "VAT %",
  vatCode: "VAT Code",
  glCode: "GL Code",
  employee: "Employee",
  originalDescription: "Description",
  approved: "Approved",
};

const SOURCE_FIELDS = Object.keys(SOURCE_FIELD_LABELS);

export function InvoiceBuilder({ runs }: { runs: ReconciliationRun[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || "");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [detecting, setDetecting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleTemplateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setTemplateFile(file);
    setTemplateHeaders([]);
    setMappings({});
    setStatus(`Reading ${file.name}…`);
    setDetecting(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/invoice-builder/detect", { method: "POST", body: formData });
    setDetecting(false);

    if (!res.ok) {
      setStatus("Could not read template headers. Make sure it's a valid .xlsx file.");
      return;
    }

    const data = await res.json();
    setTemplateHeaders(data.headers || []);
    setPreviewRows(data.previewRows || []);
    setStatus(`Detected ${data.headers?.length || 0} columns from "${data.sheetName}". Map them below or click AI Suggest.`);

    // Init mappings to empty
    const init: Record<string, string> = {};
    for (const h of data.headers || []) init[h] = "";
    setMappings(init);
  }

  async function handleAiSuggest() {
    if (templateHeaders.length === 0) return;
    setSuggesting(true);
    setStatus("AI is mapping your template columns…");

    const res = await fetch("/api/invoice-builder/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateHeaders }),
    });

    setSuggesting(false);

    if (!res.ok) {
      setStatus("AI suggestion failed. Map columns manually.");
      return;
    }

    const data = await res.json();
    const suggested: Record<string, string> = {};
    for (const header of templateHeaders) {
      suggested[header] = data.mappings?.[header] || "";
    }
    setMappings(suggested);
    setStatus("AI suggested mappings — review and adjust, then download.");
  }

  async function handleDownload() {
    if (!templateFile || !selectedRunId) return;

    const activeMappings: Record<string, string> = {};
    for (const [k, v] of Object.entries(mappings)) {
      if (v) activeMappings[k] = v;
    }

    if (Object.keys(activeMappings).length === 0) {
      setStatus("Map at least one column before downloading.");
      return;
    }

    setDownloading(true);
    setStatus("Filling template with reconciliation data…");

    const formData = new FormData();
    formData.append("template", templateFile);
    formData.append("runId", selectedRunId);
    formData.append("mappings", JSON.stringify(activeMappings));

    const res = await fetch("/api/invoice-builder/fill", { method: "POST", body: formData });
    setDownloading(false);

    if (!res.ok) {
      setStatus("Fill failed. Please try again.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `filled-${templateFile.name}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded successfully.");
  }

  const mappedCount = Object.values(mappings).filter(Boolean).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
      {/* Left: setup */}
      <div className="space-y-5">
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">1. Choose a reconciliation run</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Select which run data will be used to fill the template.
            </p>
          </div>
          <Select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name} — {run.entity || "No entity"}
              </option>
            ))}
          </Select>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">2. Upload your invoice template</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Upload the Excel (.xlsx) template your ERP or finance system expects. The column headers will be detected automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-6 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>{templateFile ? templateFile.name : "Click to upload .xlsx template"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleTemplateUpload}
          />

          {detecting && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Reading template…</p>
          )}
        </Card>

        {templateHeaders.length > 0 && (
          <Card className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">3. Map columns</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Match each template column to a reconciliation field. Use AI to auto-fill.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={suggesting}
                onClick={handleAiSuggest}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {suggesting ? "Mapping…" : "AI Suggest"}
              </Button>
            </div>

            <div className="space-y-2.5">
              {templateHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 font-mono text-xs text-[var(--color-foreground)]">
                    {header}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">→</div>
                  <Select
                    value={mappings[header] || ""}
                    onChange={(e) => setMappings((prev) => ({ ...prev, [header]: e.target.value }))}
                    className="flex-1 text-sm"
                  >
                    <option value="">— skip —</option>
                    {SOURCE_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {SOURCE_FIELD_LABELS[field]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {status && (
              <p className="rounded-xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                {status}
              </p>
            )}

            <Button
              type="button"
              disabled={downloading || mappedCount === 0 || !selectedRunId}
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Generating…" : `Download filled template (${mappedCount} column${mappedCount !== 1 ? "s" : ""})`}
            </Button>
          </Card>
        )}

        {status && templateHeaders.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{status}</p>
        )}
      </div>

      {/* Right: template preview */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Template preview</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            {templateHeaders.length === 0
              ? "Upload a template to see its structure here."
              : `${templateHeaders.length} columns detected. Mapped fields will be filled with your reconciliation data.`}
          </p>
        </div>

        {templateHeaders.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[#d4e4da]">
                  {templateHeaders.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#17343f]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
                {/* Show mapped field names as subtitle row */}
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
                  {templateHeaders.map((h) => (
                    <td key={h} className="whitespace-nowrap px-4 py-2">
                      {mappings[h] ? (
                        <span className="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-xs text-[var(--color-accent)]">
                          {SOURCE_FIELD_LABELS[mappings[h]] || mappings[h]}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length > 0 ? (
                  previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                      {templateHeaders.map((_, j) => (
                        <td key={j} className="px-4 py-3 text-[var(--color-muted-foreground)]">
                          {row[j] || ""}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={templateHeaders.length} className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                      No existing data rows in template — reconciliation data will be written from row 2.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-16 text-sm text-[var(--color-muted-foreground)]">
            No template uploaded yet
          </div>
        )}
      </Card>
    </div>
  );
}
