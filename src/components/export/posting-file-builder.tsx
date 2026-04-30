"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ReviewRow } from "@/lib/domain/types";
import {
  type PostingTemplateColumn,
  type PostingTemplateConfig,
  type PostingTemplateMapping,
  type PostingTemplateSheetPreview,
  type PostingTemplateSourceField,
} from "@/lib/export/posting-template";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const sourceFieldOptions: Array<{
  value: PostingTemplateSourceField;
  label: string;
}> = [
  { value: "source", label: "Source" },
  { value: "supplier", label: "Supplier" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "originalValue", label: "Original value" },
  { value: "gross", label: "Gross" },
  { value: "net", label: "Net" },
  { value: "vat", label: "VAT" },
  { value: "vatPercent", label: "VAT %" },
  { value: "vatCode", label: "VAT code" },
  { value: "glCode", label: "GL code" },
  { value: "originalDescription", label: "Original description" },
  { value: "employee", label: "Employee" },
  { value: "notes", label: "Notes" },
];

async function toBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function createDefaultMappings(columns: PostingTemplateColumn[]) {
  return columns.map<PostingTemplateMapping>((column) => ({
    columnKey: column.key,
    sourceType: "ignore",
  }));
}

export function PostingFileBuilder({
  runId,
  rows,
}: {
  runId: string;
  rows: ReviewRow[];
}) {
  const [templateFileName, setTemplateFileName] = useState("");
  const [templateWorkbookBase64, setTemplateWorkbookBase64] = useState("");
  const [sheets, setSheets] = useState<PostingTemplateSheetPreview[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(5);
  const [dataStartRow, setDataStartRow] = useState(7);
  const [mappings, setMappings] = useState<PostingTemplateMapping[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedSheet =
    sheets.find((sheet) => sheet.name === selectedSheetName) || sheets[0];

  const populatedRows = rows.filter((row) => !row.excludedFromExport);

  async function handleTemplateUpload(file?: File | null) {
    if (!file) {
      return;
    }

    setIsInspecting(true);
    setTemplateFileName(file.name);

    try {
      const workbookBase64 = await toBase64(file);
      setTemplateWorkbookBase64(workbookBase64);

      const response = await fetch("/api/posting-template/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbookBase64 }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        sheets: PostingTemplateSheetPreview[];
        suggestedMappings: PostingTemplateMapping[];
      };

      setSheets(payload.sheets);
      setSelectedSheetName(payload.sheets[0]?.name || "");
      setHeaderRow(payload.sheets[0]?.headerRow || 5);
      setDataStartRow(payload.sheets[0]?.dataStartRow || 7);
      setMappings(
        payload.suggestedMappings.length > 0
          ? payload.suggestedMappings
          : createDefaultMappings(payload.sheets[0]?.columns || []),
      );
    } finally {
      setIsInspecting(false);
    }
  }

  function syncMappingsForSheet(sheetName: string, nextSheets = sheets) {
    const nextSheet = nextSheets.find((sheet) => sheet.name === sheetName);
    if (!nextSheet) {
      return;
    }

    setSelectedSheetName(nextSheet.name);
    setHeaderRow(nextSheet.headerRow);
    setDataStartRow(nextSheet.dataStartRow);
    setMappings((current) =>
      nextSheet.columns.map((column) => {
        const existing = current.find((mapping) => mapping.columnKey === column.key);
        return (
          existing || {
            columnKey: column.key,
            sourceType: "ignore",
          }
        );
      }),
    );
  }

  function updateMapping(
    columnKey: string,
    updater: (mapping: PostingTemplateMapping) => PostingTemplateMapping,
  ) {
    setMappings((current) =>
      current.map((mapping) =>
        mapping.columnKey === columnKey ? updater(mapping) : mapping,
      ),
    );
  }

  async function handleGenerateWorkbook() {
    if (!templateWorkbookBase64 || !selectedSheet) {
      return;
    }

    setIsGenerating(true);

    try {
      const postingTemplate: PostingTemplateConfig = {
        sheetName: selectedSheet.name,
        headerRow,
        dataStartRow,
        mappings,
      };

      const response = await fetch(`/api/runs/${runId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "template_xlsx",
          templateWorkbookBase64,
          postingTemplate,
        }),
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${runId}-posting-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  const mappedCount = useMemo(
    () => mappings.filter((mapping) => mapping.sourceType !== "ignore").length,
    [mappings],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[0.58fr_1.42fr]">
      <Card className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Posting workbook template</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Upload a real ERP import workbook, map its columns to Zentra fields, then download a filled copy of that same workbook.
          </p>
        </div>

        <label className="block rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3">
              <Upload className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <div className="font-semibold">Upload template workbook (.xlsx)</div>
              <div className="text-sm text-[var(--color-muted-foreground)]">
              {templateFileName || "Choose the workbook you want Zentra to fill"}
              </div>
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => handleTemplateUpload(event.target.files?.[0] || null)}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Sheet</span>
            <select
              className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm"
              value={selectedSheetName}
              onChange={(event) => syncMappingsForSheet(event.target.value)}
              disabled={!selectedSheet}
            >
              {sheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Detected mappings</span>
            <div className="flex h-11 items-center rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm">
              {mappedCount} columns mapped
            </div>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Header row</span>
            <Input
              type="number"
              value={headerRow}
              onChange={(event) => setHeaderRow(Number(event.target.value || 1))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Data starts on row</span>
            <Input
              type="number"
              value={dataStartRow}
              onChange={(event) => setDataStartRow(Number(event.target.value || 1))}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {isInspecting
            ? "Inspecting workbook structure..."
            : "The builder keeps your workbook structure and writes run rows into the selected sheet from the chosen data row onward."}
        </div>

        <Button
          type="button"
          disabled={!selectedSheet || !templateWorkbookBase64 || isGenerating}
          onClick={handleGenerateWorkbook}
        >
          <Download className="mr-2 h-4 w-4" />
          Generate posting workbook
        </Button>
      </Card>

      <Card className="space-y-4 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Template mapping</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Review each workbook column, choose the Zentra field that should fill it, or set a constant value for required ERP defaults.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)]">
            {populatedRows.length} export rows ready
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-[var(--color-border)]">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[var(--color-panel)]">
              <tr className="text-left">
                <th className="border-b border-[var(--color-border)] px-4 py-3 font-semibold">Workbook column</th>
                <th className="border-b border-[var(--color-border)] px-4 py-3 font-semibold">Source</th>
                <th className="border-b border-[var(--color-border)] px-4 py-3 font-semibold">Constant</th>
                <th className="border-b border-[var(--color-border)] px-4 py-3 font-semibold">Sample</th>
              </tr>
            </thead>
            <tbody>
              {(selectedSheet?.columns || []).map((column) => {
                const mapping =
                  mappings.find((candidate) => candidate.columnKey === column.key) || {
                    columnKey: column.key,
                    sourceType: "ignore" as const,
                  };

                return (
                  <tr key={`${column.letter}-${column.key}`} className="align-top">
                    <td className="border-b border-[var(--color-border)] px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-foreground)]">
                          {column.letter}
                        </div>
                        <div>
                          <div className="font-semibold">{column.key || "(blank key)"}</div>
                          <div className="text-xs text-[var(--color-muted-foreground)]">
                            {column.label || "No display label"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[var(--color-border)] px-4 py-3">
                      <select
                        className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm"
                        value={
                          mapping.sourceType === "field"
                            ? `field:${mapping.sourceField || ""}`
                            : mapping.sourceType === "constant"
                              ? "constant"
                              : "ignore"
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "ignore") {
                            updateMapping(column.key, () => ({
                              columnKey: column.key,
                              sourceType: "ignore",
                            }));
                            return;
                          }

                          if (value === "constant") {
                            updateMapping(column.key, (current) => ({
                              columnKey: column.key,
                              sourceType: "constant",
                              constantValue: current.constantValue || column.sampleValue || "",
                            }));
                            return;
                          }

                          updateMapping(column.key, () => ({
                            columnKey: column.key,
                            sourceType: "field",
                            sourceField: value.replace("field:", "") as PostingTemplateSourceField,
                          }));
                        }}
                      >
                        <option value="ignore">Ignore</option>
                        <option value="constant">Constant value</option>
                        {sourceFieldOptions.map((option) => (
                          <option key={option.value} value={`field:${option.value}`}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-[var(--color-border)] px-4 py-3">
                      {mapping.sourceType === "constant" ? (
                        <Input
                          value={mapping.constantValue || ""}
                          onChange={(event) =>
                            updateMapping(column.key, (current) => ({
                              ...current,
                              constantValue: event.target.value,
                            }))
                          }
                          placeholder="Constant value"
                        />
                      ) : (
                        <div className="flex h-11 items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-sm text-[var(--color-muted-foreground)]">
                          {mapping.sourceType === "field" ? "From run data" : "Not used"}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-4 py-3 text-[var(--color-muted-foreground)]">
                      {column.sampleValue || "—"}
                    </td>
                  </tr>
                );
              })}
              {!selectedSheet ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                    <div className="flex flex-col items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8" />
                      <span>Upload a workbook template to inspect its posting columns.</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
