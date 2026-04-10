"use client";

import { useMemo, useRef, useState } from "react";
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

interface TemplateColumn {
  id: string;
  label: string;
  columnNumber?: number;
  letter?: string;
}

interface OutputTemplate {
  id: string;
  name: string;
  description: string;
  headers: string[];
  mappings: Record<string, string>;
  previewRows?: string[][];
  columns?: TemplateColumn[];
  createdAt: string;
  updatedAt: string;
}

interface ReportPreviewColumn {
  letter: string;
  label: string;
  index: number;
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
  const now = new Date().toISOString();
  return {
    id: `ot_${now}`,
    name: "",
    description: "",
    headers: [],
    mappings: {},
    previewRows: [],
    columns: [],
    createdAt: now,
    updatedAt: now,
  };
}

function duplicateOutputTemplate(template: OutputTemplate): OutputTemplate {
  const now = new Date().toISOString();
  return {
    ...template,
    id: `ot_${now}`,
    name: `${template.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

function getExcelColumnName(columnNumber: number) {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

export function PostingFileBuilder({ runs }: { runs: ReconciliationRun[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<OutputTemplate[]>(() => loadTemplates());
  const [editing, setEditing] = useState<OutputTemplate>(blankTemplate());
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || "");
  const [detecting, setDetecting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [manualColumnId, setManualColumnId] = useState<string | null>(null);
  const [selectedRepopulateColumns, setSelectedRepopulateColumns] = useState<Record<string, boolean>>(
    {},
  );
  const [status, setStatus] = useState<string | null>(null);
  const [newHeaderInput, setNewHeaderInput] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [reportPreview, setReportPreview] = useState<{
    sheetName: string;
    columns: ReportPreviewColumn[];
    rows: string[][];
  } | null>(null);

  const columns = useMemo(
    () =>
      editing.columns && editing.columns.length > 0
        ? editing.columns
        : editing.headers.map((header, index) => ({
            id: header,
            label: header,
            letter: getExcelColumnName(index + 1),
          })),
    [editing.columns, editing.headers],
  );

  const activeSheetColumns = reportPreview
    ? reportPreview.columns.map((column) => ({
        id: `preview_${column.index}`,
        label: column.label,
        letter: column.letter,
      }))
    : columns;

  const activeSheetRows = reportPreview ? reportPreview.rows : editing.previewRows || [];

  function startNew() {
    setEditing(blankTemplate());
    setTemplateFile(null);
    setReportPreview(null);
    setSelectedRepopulateColumns({});
    setStatus(null);
  }

  function loadTemplate(template: OutputTemplate) {
    setEditing({ ...template });
    setTemplateFile(null);
    setReportPreview(null);
    setSelectedRepopulateColumns({});
    setStatus(`Loaded template "${template.name}". Select a run and download.`);
  }

  function deleteTemplate(id: string) {
    const next = templates.filter((template) => template.id !== id);
    setTemplates(next);
    saveTemplatesToStorage(next);
    if (editing.id === id) {
      startNew();
    }
  }

  function saveTemplate() {
    const name = editing.name.trim();
    if (!name) {
      setStatus("Enter a template name before saving.");
      return;
    }

    if (editing.headers.length === 0) {
      setStatus("Add at least one column before saving.");
      return;
    }

    const now = new Date().toISOString();
    const existing = templates.find((template) => template.id === editing.id);
    const nextTemplate = {
      ...editing,
      name,
      columns,
      updatedAt: now,
    };

    const next = existing
      ? templates.map((template) => (template.id === editing.id ? nextTemplate : template))
      : [nextTemplate, ...templates];

    setTemplates(next);
    saveTemplatesToStorage(next);
    setStatus(`Template "${name}" saved.`);
  }

  function duplicateTemplate(template: OutputTemplate) {
    const copy = duplicateOutputTemplate(template);
    const next = [copy, ...templates];
    setTemplates(next);
    saveTemplatesToStorage(next);
    setEditing(copy);
    setStatus(`Duplicated as "${copy.name}".`);
  }

  function setMapping(header: string, field: string) {
    setEditing((prev) => ({
      ...prev,
      mappings: { ...prev.mappings, [header]: field },
    }));
  }

  function addHeaderManually() {
    const label = newHeaderInput.trim();
    if (!label) {
      return;
    }

    const id = editing.headers.includes(label) ? `${label} [MANUAL ${Date.now()}]` : label;
    setEditing((prev) => ({
      ...prev,
      headers: [...prev.headers, id],
      columns: [
        ...(prev.columns || []),
        {
          id,
          label,
          letter: getExcelColumnName((prev.headers?.length || 0) + 1),
        },
      ],
      mappings: { ...prev.mappings, [id]: "" },
    }));
    setNewHeaderInput("");
  }

  function removeHeader(header: string) {
    setEditing((prev) => {
      const nextMappings = { ...prev.mappings };
      delete nextMappings[header];
      return {
        ...prev,
        headers: prev.headers.filter((candidate) => candidate !== header),
        columns: (prev.columns || []).filter((candidate) => candidate.id !== header),
        mappings: nextMappings,
        previewRows: (prev.previewRows || []).map((row) =>
          row.filter((_, index) => prev.headers[index] !== header),
        ),
      };
    });
  }

  async function requestAiMappings(
    headers: string[],
    previewRows: string[][],
    runId: string,
  ): Promise<Record<string, string>> {
    if (headers.length === 0) {
      return {};
    }

    const response = await fetch("/api/invoice-builder/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateHeaders: headers,
        previewRows,
        runId,
      }),
    });

    if (!response.ok) {
      throw new Error("AI suggestion failed");
    }

    const data = (await response.json()) as {
      mappings?: Record<string, string | null>;
    };

    const nextMappings: Record<string, string> = {};
    for (const header of headers) {
      const suggestedValue = data.mappings?.[header];
      nextMappings[header] = typeof suggestedValue === "string" ? suggestedValue : "";
    }

    return nextMappings;
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setTemplateFile(file);
    setReportPreview(null);
    setDetecting(true);
    setStatus(`Reading "${file.name}" and detecting the workbook format...`);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/invoice-builder/detect", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      setDetecting(false);
      setStatus("Could not read template. Make sure it is a valid .xlsx file.");
      return;
    }

    const data = (await response.json()) as {
      headers: string[];
      columns?: TemplateColumn[];
      previewRows?: string[][];
      sheetName: string;
    };

    const normalizedHeaders = data.headers || [];
    const normalizedColumns = (data.columns || []).map((column, index) => ({
      ...column,
      letter: column.letter || getExcelColumnName(index + 1),
    }));
    const normalizedPreviewRows = data.previewRows || [];

    setSuggesting(true);
    setStatus(`Workbook detected. AI is matching "${file.name}" automatically...`);

    let suggestedMappings: Record<string, string> = {};
    try {
      suggestedMappings = await requestAiMappings(
        normalizedHeaders,
        normalizedPreviewRows,
        selectedRunId,
      );
    } catch {
      suggestedMappings = {};
    } finally {
      setSuggesting(false);
      setDetecting(false);
    }

    const initMappings: Record<string, string> = {};
    for (const header of normalizedHeaders) {
      initMappings[header] = suggestedMappings[header] || editing.mappings[header] || "";
    }

    setEditing((prev) => ({
      ...prev,
      name: prev.name || file.name.replace(/\.xlsx?$/i, ""),
      headers: normalizedHeaders,
      columns: normalizedColumns,
      previewRows: normalizedPreviewRows,
      mappings: initMappings,
    }));
    setSelectedRepopulateColumns({});
    const mappedCount = Object.values(initMappings).filter(Boolean).length;
    setStatus(
      `Detected ${normalizedHeaders.length} columns from "${data.sheetName}" and auto-mapped ${mappedCount}. Press Repopulate on the columns you want the report to overwrite from the reconciliation run.`,
    );
  }

  async function handleAiSuggest() {
    if (editing.headers.length === 0) {
      return;
    }

    setSuggesting(true);
    setStatus("AI is reviewing the existing template values and suggesting mappings...");

    try {
      const nextMappings = await requestAiMappings(
        editing.headers,
        editing.previewRows || [],
        selectedRunId,
      );
      setEditing((prev) => ({
        ...prev,
        mappings: nextMappings,
      }));
      setReportPreview(null);
      setStatus("AI refreshed the detected fields. Press Repopulate on the columns you want applied to the report.");
    } catch {
      setSuggesting(false);
      setStatus("AI suggestion failed. Review the mapping row manually.");
      return;
    }
    setSuggesting(false);
  }

  function toggleRepopulateColumn(columnId: string) {
    setSelectedRepopulateColumns((current) => {
      const next = { ...current, [columnId]: !current[columnId] };
      return next;
    });
    setReportPreview(null);
    setStatus(`Marked ${columnId} for report overwrite. Click Update report to apply the selected columns.`);
  }

  function getActiveMappings() {
    const activeMappings: Record<string, string> = {};
    for (const [key, value] of Object.entries(editing.mappings)) {
      if (value && selectedRepopulateColumns[key]) {
        activeMappings[key] = value;
      }
    }
    return activeMappings;
  }

  async function handleUpdateReport() {
    if (!selectedRunId) {
      setStatus("Select a run first.");
      return;
    }

    if (!templateFile) {
      setStatus("Upload a workbook template first.");
      return;
    }

    setPreviewing(true);
    setStatus("Building the updated report preview...");

    const activeMappings = getActiveMappings();
    if (Object.keys(activeMappings).length === 0) {
      setPreviewing(false);
      setStatus("Select at least one Repopulate column first.");
      return;
    }

    const formData = new FormData();
    formData.append("template", templateFile);
    formData.append("runId", selectedRunId);
    formData.append("mappings", JSON.stringify(activeMappings));

    const response = await fetch("/api/invoice-builder/preview", {
      method: "POST",
      body: formData,
    });

    setPreviewing(false);

    if (!response.ok) {
      setStatus("Could not build the updated report preview.");
      return;
    }

    const data = (await response.json()) as {
      sheetName: string;
      columns: ReportPreviewColumn[];
      reportRows: string[][];
    };

    setReportPreview({
      sheetName: data.sheetName,
      columns: data.columns || [],
      rows: data.reportRows || [],
    });
    setStatus(`Updated report preview for "${data.sheetName}".`);
  }

  async function handleDownload() {
    if (!selectedRunId) {
      setStatus("Select a run first.");
      return;
    }

    if (editing.headers.length === 0) {
      setStatus("Add columns to the template first.");
      return;
    }

    const activeMappings = getActiveMappings();

    if (Object.keys(activeMappings).length === 0) {
      setStatus("Select at least one Repopulate column before downloading.");
      return;
    }

    let fileToFill = templateFile;

    if (!fileToFill) {
      setDownloading(true);
      setStatus("Building template structure from saved headers...");
      const buildResponse = await fetch("/api/invoice-builder/build-blank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: editing.headers }),
      });

      if (!buildResponse.ok) {
        setStatus("Could not build template. Please upload a .xlsx file instead.");
        setDownloading(false);
        return;
      }

      const blob = await buildResponse.blob();
      fileToFill = new File([blob], `${editing.name || "template"}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } else {
      setDownloading(true);
    }

    setStatus("Filling template with reconciliation data...");

    const formData = new FormData();
    formData.append("template", fileToFill);
    formData.append("runId", selectedRunId);
    formData.append("mappings", JSON.stringify(activeMappings));

    const response = await fetch("/api/invoice-builder/fill", {
      method: "POST",
      body: formData,
    });
    setDownloading(false);

    if (!response.ok) {
      setStatus("Fill failed. Please try again.");
      return;
    }

    const blob = await response.blob();
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

  const mappedCount = Object.keys(getActiveMappings()).length;
  const isNewTemplate = !templates.some((template) => template.id === editing.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
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

        {templates.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No saved templates yet. Build one and save it for reuse.
          </p>
        ) : null}

        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => loadTemplate(template)}
              className={`group flex cursor-pointer items-start justify-between rounded-2xl border px-4 py-3.5 text-sm transition ${
                editing.id === template.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-border)] bg-white hover:bg-[var(--color-panel)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-[var(--color-foreground)]">
                  {template.name}
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {template.headers.length} columns -{" "}
                  {Object.values(template.mappings).filter(Boolean).length} mapped
                </div>
                {template.description ? (
                  <div className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                    {template.description}
                  </div>
                ) : null}
              </div>
              <div className="ml-2 flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  title="Duplicate"
                  onClick={(event) => {
                    event.stopPropagation();
                    duplicateTemplate(template);
                  }}
                  className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteTemplate(template.id);
                  }}
                  className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
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
                onChange={(event) =>
                  setEditing((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Description (optional)</span>
              <Input
                placeholder="e.g. For UK entity, month-end AP posting"
                value={editing.description}
                onChange={(event) =>
                  setEditing((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Reconciliation run</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Choose which approved run data to use when generating the output file.
            </p>
          </div>
          <Select
            value={selectedRunId}
            onChange={(event) => {
              setSelectedRunId(event.target.value);
              setReportPreview(null);
            }}
          >
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name} - {run.entity || run.defaultCurrency}
              </option>
            ))}
          </Select>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Template workbook</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
                Upload your destination template and let detection decide which values should be overwritten when the run changes.
              </p>
              {reportPreview ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
                  Showing updated report preview
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {editing.headers.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={suggesting}
                  onClick={handleAiSuggest}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {suggesting ? "Reviewing..." : "Refresh AI mapping"}
                </Button>
              ) : null}
              {editing.headers.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={previewing || !templateFile}
                  onClick={handleUpdateReport}
                >
                  {previewing ? "Updating..." : "Update report"}
                </Button>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-5 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>
              {detecting
                ? "Reading template..."
                : templateFile
                  ? `Using: ${templateFile.name} (click to replace)`
                  : "Upload your .xlsx template to inspect it"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex gap-2">
            <Input
              placeholder="Or type a column name and press Enter"
              value={newHeaderInput}
              onChange={(event) => setNewHeaderInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addHeaderManually();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addHeaderManually}
              disabled={!newHeaderInput.trim()}
            >
              Add
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="min-w-max">
              <div className="flex border-b border-[var(--color-border)] bg-[#eef2f5]">
                <div className="w-14 shrink-0 border-r border-[var(--color-border)] bg-[#e5eaee]" />
                {activeSheetColumns.map((column, columnIndex) => (
                  <div
                    key={`${column.id}_letter`}
                    className="flex h-10 items-center justify-center border-r border-[var(--color-border)] px-3 text-xs font-semibold text-[#61707b]"
                    style={{ width: "240px" }}
                  >
                    {column.letter || getExcelColumnName(columnIndex + 1)}
                  </div>
                ))}
              </div>

              <div className="flex border-b border-[var(--color-border)] bg-[#d4e4da]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#e5eaee] text-xs font-semibold text-[#61707b]">
                  1
                </div>
                {activeSheetColumns.map((column) => (
                  <div
                    key={`${column.id}_header`}
                    className="flex h-14 items-center border-r border-[var(--color-border)] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#17343f]"
                    style={{ width: "240px" }}
                  >
                    <span className="truncate">{column.label}</span>
                  </div>
                ))}
              </div>

              {!reportPreview ? (
                <div className="flex border-b border-[var(--color-border)] bg-[#f8f4ed]">
                  <div className="flex min-h-20 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#f6f8fa] text-xs font-semibold text-[#61707b]">
                    2
                  </div>
                  {columns.map((column) => (
                    <div
                      key={`${column.id}_mapping`}
                      className={`border-r border-[var(--color-border)] px-3 py-3 ${
                        selectedRepopulateColumns[column.id]
                          ? "bg-[var(--color-accent-soft)]"
                          : ""
                      }`}
                      style={{ width: "240px" }}
                    >
                      <div
                        className={`rounded-xl border px-3 py-2 text-sm font-medium text-[var(--color-foreground)] ${
                          selectedRepopulateColumns[column.id]
                            ? "border-[var(--color-accent)] bg-white"
                            : "border-[var(--color-border)] bg-white"
                        }`}
                      >
                        {editing.mappings[column.id]
                          ? SOURCE_FIELD_LABELS[editing.mappings[column.id]]
                          : "Keep template values"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRepopulateColumn(column.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            selectedRepopulateColumns[column.id]
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                              : "border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-panel)]"
                          }`}
                        >
                          {selectedRepopulateColumns[column.id] ? "Selected" : "Repopulate"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setManualColumnId((current) => (current === column.id ? null : column.id))
                          }
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-panel)]"
                        >
                          {manualColumnId === column.id ? "Hide field picker" : "Choose field"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMapping(column.id, "");
                            setSelectedRepopulateColumns((current) => ({
                              ...current,
                              [column.id]: false,
                            }));
                            setReportPreview(null);
                          }}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-panel)]"
                        >
                          Keep template
                        </button>
                      </div>
                      {manualColumnId === column.id ? (
                        <Select
                          value={editing.mappings[column.id] || ""}
                          onChange={(event) => {
                            setMapping(column.id, event.target.value);
                            setSelectedRepopulateColumns((current) => ({
                              ...current,
                              [column.id]: Boolean(event.target.value),
                            }));
                            setReportPreview(null);
                          }}
                          className="mt-2 h-10 rounded-xl text-sm"
                        >
                          <option value="">- keep template value -</option>
                          {SOURCE_FIELDS.map((field) => (
                            <option key={field} value={field}>
                              {SOURCE_FIELD_LABELS[field]}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeHeader(column.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove column
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeSheetRows.map((previewRow, rowIndex) => (
                <div
                  key={`preview_row_${rowIndex}`}
                  className="flex border-b border-[var(--color-border)] last:border-b-0"
                >
                  <div className="flex min-h-16 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#f6f8fa] text-xs font-semibold text-[#61707b]">
                    {rowIndex + (reportPreview ? 2 : 3)}
                  </div>
                  {activeSheetColumns.map((column, columnIndex) => (
                    <div
                      key={`${column.id}_sample_${rowIndex}`}
                      className="min-h-16 border-r border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)] last:border-r-0"
                      style={{ width: "240px" }}
                    >
                      <div className="truncate">{previewRow[columnIndex] || ""}</div>
                    </div>
                  ))}
                </div>
              ))}

              {activeSheetColumns.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
                  Upload a template to inspect it as a sheet.
                </div>
              ) : null}
            </div>
          </div>

          {status ? (
            <div className="rounded-xl bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {status}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Generate posting file</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Downloads an `.xlsx` file with your mapped reconciliation data pre-filled into the template structure.
              {mappedCount > 0 ? (
                <span className="ml-1 font-medium text-[var(--color-foreground)]">
                  {mappedCount} selected columns will be populated from the reconciliation run.
                </span>
              ) : null}
            </p>
          </div>

          {editing.headers.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              Add columns above before downloading.
            </div>
          ) : null}

          {editing.headers.length > 0 && mappedCount === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Press Repopulate on the columns you want to overwrite from the reconciliation run.
            </div>
          ) : null}

          <Button
            type="button"
            disabled={downloading || mappedCount === 0 || !selectedRunId}
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Generating..." : "Download posting file"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
