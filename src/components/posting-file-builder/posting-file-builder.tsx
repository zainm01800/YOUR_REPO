"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ReconciliationRun } from "@/lib/domain/types";

const SOURCE_FIELD_LABELS: Record<string, string> = {
  supplier: "Supplier / Vendor",
  date: "Transaction Date",
  currency: "Currency",
  originalAmount: "Original Amount",
  gross: "Gross Amount",
  net: "Net Amount",
  vat: "VAT Amount",
  vatPercent: "VAT Rate (%)",
  vatCode: "VAT Code",
  glCode: "GL Account Code",
  employee: "Employee",
  originalDescription: "Description / Narration",
  approved: "Approved",
};

const SOURCE_FIELDS = Object.keys(SOURCE_FIELD_LABELS);

const OUTPUT_TEMPLATE_KEY = "pfb_output_templates_v1";

interface OutputTemplate {
  id: string;
  name: string;
  description: string;
  headers: string[];
  mappings: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

function loadTemplates(): OutputTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(OUTPUT_TEMPLATE_KEY);
    return stored ? (JSON.parse(stored) as OutputTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveTemplatesToStorage(templates: OutputTemplate[]) {
  window.localStorage.setItem(OUTPUT_TEMPLATE_KEY, JSON.stringify(templates));
}

function blankTemplate(): OutputTemplate {
  return {
    id: `ot_${Date.now()}`,
    name: "",
    description: "",
    headers: [],
    mappings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function PostingFileBuilder({ runs }: { runs: ReconciliationRun[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<OutputTemplate[]>([]);
  const [editing, setEditing] = useState<OutputTemplate>(blankTemplate());
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || "");
  const [detecting, setDetecting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [newHeaderInput, setNewHeaderInput] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  useEffect(() => {
    const stored = loadTemplates();
    setTemplates(stored);
  }, []);

  function startNew() {
    setEditing(blankTemplate());
    setTemplateFile(null);
    setStatus(null);
  }

  function loadTemplate(template: OutputTemplate) {
    setEditing({ ...template });
    setTemplateFile(null);
    setStatus(`Loaded template "${template.name}". Select a run and download.`);
  }

  function deleteTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplatesToStorage(next);
    if (editing.id === id) startNew();
  }

  function saveTemplate() {
    const name = editing.name.trim();
    if (!name) { setStatus("Enter a template name before saving."); return; }
    if (editing.headers.length === 0) { setStatus("Add at least one column before saving."); return; }

    const now = new Date().toISOString();
    const existing = templates.find((t) => t.id === editing.id);
    let next: OutputTemplate[];

    if (existing) {
      next = templates.map((t) =>
        t.id === editing.id ? { ...editing, name, updatedAt: now } : t,
      );
    } else {
      const saved: OutputTemplate = { ...editing, name, updatedAt: now };
      next = [saved, ...templates];
    }

    setTemplates(next);
    saveTemplatesToStorage(next);
    setStatus(`Template "${name}" saved.`);
  }

  function duplicateTemplate(template: OutputTemplate) {
    const copy: OutputTemplate = {
      ...template,
      id: `ot_${Date.now()}`,
      name: `${template.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [copy, ...templates];
    setTemplates(next);
    saveTemplatesToStorage(next);
    setEditing(copy);
    setStatus(`Duplicated as "${copy.name}".`);
  }

  function setMapping(header: string, field: string) {
    setEditing((prev) => ({ ...prev, mappings: { ...prev.mappings, [header]: field } }));
  }

  function addHeaderManually() {
    const h = newHeaderInput.trim();
    if (!h) return;
    if (editing.headers.includes(h)) { setNewHeaderInput(""); return; }
    setEditing((prev) => ({ ...prev, headers: [...prev.headers, h], mappings: { ...prev.mappings, [h]: "" } }));
    setNewHeaderInput("");
  }

  function removeHeader(header: string) {
    setEditing((prev) => {
      const { [header]: _, ...rest } = prev.mappings;
      return { ...prev, headers: prev.headers.filter((h) => h !== header), mappings: rest };
    });
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setTemplateFile(file);
    setDetecting(true);
    setStatus(`Reading "${file.name}"…`);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/invoice-builder/detect", { method: "POST", body: formData });
    setDetecting(false);

    if (!res.ok) { setStatus("Could not read template. Make sure it is a valid .xlsx file."); return; }

    const data = await res.json();
    const headers: string[] = data.headers || [];
    const initMappings: Record<string, string> = {};
    for (const h of headers) initMappings[h] = editing.mappings[h] || "";

    setEditing((prev) => ({
      ...prev,
      name: prev.name || file.name.replace(/\.xlsx?$/i, ""),
      headers,
      mappings: initMappings,
    }));
    setStatus(`Detected ${headers.length} columns from "${data.sheetName}". Use AI Suggest or map manually.`);
  }

  async function handleAiSuggest() {
    if (editing.headers.length === 0) return;
    setSuggesting(true);
    setStatus("AI is suggesting column mappings…");

    const res = await fetch("/api/invoice-builder/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateHeaders: editing.headers }),
    });
    setSuggesting(false);

    if (!res.ok) { setStatus("AI suggestion failed — map columns manually."); return; }

    const data = await res.json();
    setEditing((prev) => {
      const next = { ...prev.mappings };
      for (const h of prev.headers) {
        if (data.mappings?.[h]) next[h] = data.mappings[h];
      }
      return { ...prev, mappings: next };
    });
    setStatus("AI mapped the columns — review and adjust, then save or download.");
  }

  async function handleDownload() {
    if (!selectedRunId) { setStatus("Select a run first."); return; }
    if (editing.headers.length === 0) { setStatus("Add columns to the template first."); return; }

    const activeMappings: Record<string, string> = {};
    for (const [k, v] of Object.entries(editing.mappings)) {
      if (v) activeMappings[k] = v;
    }
    if (Object.keys(activeMappings).length === 0) {
      setStatus("Map at least one column before downloading.");
      return;
    }

    // We need a file to fill. If we have one from upload, use it. Otherwise build one from headers.
    let fileToFill = templateFile;

    if (!fileToFill) {
      // Generate a minimal xlsx from just the headers using the server
      setDownloading(true);
      setStatus("Building template structure from saved headers…");
      const buildRes = await fetch("/api/invoice-builder/build-blank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: editing.headers }),
      });

      if (!buildRes.ok) {
        setStatus("Could not build template. Please upload a .xlsx file instead.");
        setDownloading(false);
        return;
      }
      const blob = await buildRes.blob();
      fileToFill = new File([blob], `${editing.name || "template"}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else {
      setDownloading(true);
    }

    setStatus("Filling template with reconciliation data…");

    const formData = new FormData();
    formData.append("template", fileToFill);
    formData.append("runId", selectedRunId);
    formData.append("mappings", JSON.stringify(activeMappings));

    const res = await fetch("/api/invoice-builder/fill", { method: "POST", body: formData });
    setDownloading(false);

    if (!res.ok) { setStatus("Fill failed — please try again."); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editing.name || "posting-file"}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded "${link.download}" successfully.`);
  }

  const mappedCount = editing.headers.filter((h) => editing.mappings[h]).length;
  const isNewTemplate = !templates.some((t) => t.id === editing.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* Left: saved templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Output templates
          </h2>
          <Button type="button" variant="secondary" onClick={startNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </div>

        {templates.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No saved templates yet. Build one and save it for reuse.
          </p>
        )}

        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => loadTemplate(t)}
              className={`group flex cursor-pointer items-start justify-between rounded-2xl border px-4 py-3.5 text-sm transition ${
                editing.id === t.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-border)] bg-white hover:bg-[var(--color-panel)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-[var(--color-foreground)]">
                  {t.name}
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {t.headers.length} columns · {Object.values(t.mappings).filter(Boolean).length} mapped
                </div>
                {t.description && (
                  <div className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                    {t.description}
                  </div>
                )}
              </div>
              <div className="ml-2 flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  title="Duplicate"
                  onClick={(e) => { e.stopPropagation(); duplicateTemplate(t); }}
                  className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                  className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: editor */}
      <div className="space-y-5">
        {/* Template identity */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {isNewTemplate ? "New output template" : `Edit: ${editing.name || "Untitled"}`}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
                Define how reconciliation data maps into your destination file format.
              </p>
            </div>
            <Button type="button" onClick={saveTemplate} variant="secondary">
              {isNewTemplate ? "Save template" : "Update template"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Template name</span>
              <Input
                placeholder="e.g. SAP FI Upload, Xero Bills Import"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Description (optional)</span>
              <Input
                placeholder="e.g. For UK entity, month-end AP posting"
                value={editing.description}
                onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
          </div>
        </Card>

        {/* Run selector */}
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Reconciliation run</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Choose which approved run's data to use when generating the output file.
            </p>
          </div>
          <Select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name} — {run.entity || run.defaultCurrency}
              </option>
            ))}
          </Select>
        </Card>

        {/* Column definition */}
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Output columns</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
                Upload your destination template to auto-detect columns, or add them manually.
              </p>
            </div>
            {editing.headers.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                disabled={suggesting}
                onClick={handleAiSuggest}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {suggesting ? "Mapping…" : "AI Suggest"}
              </Button>
            )}
          </div>

          {/* Upload zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-5 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>
              {detecting
                ? "Reading template…"
                : templateFile
                  ? `Using: ${templateFile.name} (click to replace)`
                  : "Upload your .xlsx template to auto-detect columns"}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />

          {/* Manual add */}
          <div className="flex gap-2">
            <Input
              placeholder="Or type a column name and press Enter"
              value={newHeaderInput}
              onChange={(e) => setNewHeaderInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHeaderManually(); } }}
            />
            <Button type="button" variant="secondary" onClick={addHeaderManually} disabled={!newHeaderInput.trim()}>
              Add
            </Button>
          </div>

          {/* Column mapping grid */}
          {editing.headers.length > 0 && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-[1fr_20px_1fr_32px] items-center gap-2 px-1">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Template column
                </div>
                <div />
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Reconciliation field
                </div>
                <div />
              </div>
              {editing.headers.map((header) => (
                <div key={header} className="grid grid-cols-[1fr_20px_1fr_32px] items-center gap-2">
                  <div className="truncate rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 font-mono text-xs text-[var(--color-foreground)]">
                    {header}
                  </div>
                  <div className="text-center text-xs text-[var(--color-muted-foreground)]">→</div>
                  <Select
                    value={editing.mappings[header] || ""}
                    onChange={(e) => setMapping(header, e.target.value)}
                  >
                    <option value="">— skip this column —</option>
                    {SOURCE_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {SOURCE_FIELD_LABELS[field]}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeHeader(header)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {status && (
            <div className="rounded-xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {status}
            </div>
          )}
        </Card>

        {/* Download */}
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Generate posting file</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Downloads an .xlsx file with your mapped reconciliation data pre-filled into the template structure.
              {mappedCount > 0 && (
                <span className="ml-1 font-medium text-[var(--color-foreground)]">
                  {mappedCount} of {editing.headers.length} columns will be populated.
                </span>
              )}
            </p>
          </div>

          {editing.headers.length === 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              Add columns above before downloading.
            </div>
          )}

          {editing.headers.length > 0 && mappedCount === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Map at least one column to a reconciliation field before generating the file.
            </div>
          )}

          <Button
            type="button"
            disabled={downloading || mappedCount === 0 || !selectedRunId}
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Generating…" : "Download posting file"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
