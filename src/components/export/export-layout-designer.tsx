"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, RotateCcw } from "lucide-react";
import type { ExportColumnLayout, ReviewRow } from "@/lib/domain/types";
import {
  defaultExportLayout,
  exportLayoutPresets,
  getPreviewCellValue,
  getVisibleExportLayout,
  normaliseExportLayout,
} from "@/lib/export/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function moveColumn(
  columns: ExportColumnLayout[],
  fromIndex: number,
  toIndex: number,
) {
  const next = [...columns];
  const [column] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, column);
  return next;
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

function getFormulaPreview(
  visibleLayout: ExportColumnLayout[],
  columnKey: ExportColumnLayout["key"],
  rowNumber: number,
) {
  const currentIndex = visibleLayout.findIndex((column) => column.key === columnKey);
  const netIndex = visibleLayout.findIndex((column) => column.key === "net");
  const vatIndex = visibleLayout.findIndex((column) => column.key === "vat");

  if (currentIndex < 0 || netIndex < 0 || vatIndex < 0) {
    return null;
  }

  const currentColumn = getExcelColumnName(currentIndex + 1);
  const netColumn = getExcelColumnName(netIndex + 1);
  const vatColumn = getExcelColumnName(vatIndex + 1);

  if (columnKey === "gross") {
    return `${currentColumn}${rowNumber} = ${netColumn}${rowNumber} + ${vatColumn}${rowNumber}`;
  }

  if (columnKey === "vatPercent") {
    return `${currentColumn}${rowNumber} = ${vatColumn}${rowNumber} / ${netColumn}${rowNumber}`;
  }

  return null;
}

export function ExportLayoutDesigner({
  runId,
  rows,
}: {
  runId: string;
  rows: ReviewRow[];
}) {
  const [layout, setLayout] = useState<ExportColumnLayout[]>(
    normaliseExportLayout(defaultExportLayout),
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const visibleLayout = useMemo(() => getVisibleExportLayout(layout), [layout]);
  const previewRows = rows.filter((row) => !row.excludedFromExport).slice(0, 5);

  function updateColumn(
    index: number,
    updater: (column: ExportColumnLayout) => ExportColumnLayout,
  ) {
    setLayout((current) =>
      current.map((column, currentIndex) =>
        currentIndex === index ? updater(column) : column,
      ),
    );
  }

  function applyPreset(presetId: string) {
    const preset = exportLayoutPresets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    setLayout(normaliseExportLayout(preset.layout));
  }

  async function download(format: "csv" | "xlsx") {
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/runs/${runId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ format, layout }),
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${runId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
              Export layout
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Preview the sheet, then change column order, labels, visibility, and width before downloading.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLayout(normaliseExportLayout(defaultExportLayout))}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium">Quick presets</span>
          <select
            className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm"
            onChange={(event) => applyPreset(event.target.value)}
            defaultValue=""
          >
            <option value="">Choose a layout preset</option>
            {exportLayoutPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-3">
          {layout.map((column, index) => (
            <div
              key={column.key}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={(event) =>
                      updateColumn(index, (current) => ({
                        ...current,
                        visible: event.target.checked,
                      }))
                    }
                  />
                  {column.key}
                </label>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3"
                    disabled={index === 0}
                    onClick={() =>
                      setLayout((current) => moveColumn(current, index, index - 1))
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3"
                    disabled={index === layout.length - 1}
                    onClick={() =>
                      setLayout((current) => moveColumn(current, index, index + 1))
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px]">
                <Input
                  value={column.label}
                  onChange={(event) =>
                    updateColumn(index, (current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Column label"
                />
                <Input
                  type="number"
                  min={8}
                  max={60}
                  value={column.width || 16}
                  onChange={(event) =>
                    updateColumn(index, (current) => ({
                      ...current,
                      width: Number(event.target.value || 16),
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={isDownloading} onClick={() => download("xlsx")}>
            <Download className="mr-2 h-4 w-4" />
            Download .xlsx
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isDownloading}
            onClick={() => download("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Download .csv
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">
            Excel-style preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            This mirrors the returned workbook layout with visible widths, header styling, and generated formula columns.
          </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Frozen header</Badge>
            <Badge tone="success">Formula cells</Badge>
            <Badge tone="neutral">{visibleLayout.length} visible columns</Badge>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="min-w-max">
            <div className="flex border-b border-[var(--color-border)] bg-[#eef2f5]">
              <div className="w-14 shrink-0 border-r border-[var(--color-border)] bg-[#e5eaee]" />
              {visibleLayout.map((column, index) => (
                <div
                  key={`${column.key}_letter`}
                  className="flex h-10 items-center justify-center border-r border-[var(--color-border)] text-xs font-semibold text-[#61707b]"
                  style={{ width: `${(column.width || 16) * 10}px` }}
                >
                  {getExcelColumnName(index + 1)}
                </div>
              ))}
            </div>

            <div className="flex border-b border-[var(--color-border)] bg-[#d4e4da]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#e5eaee] text-xs font-semibold text-[#61707b]">
                1
              </div>
              {visibleLayout.map((column) => (
                <div
                  key={`${column.key}_header`}
                  className="flex h-14 items-center border-r border-[var(--color-border)] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#17343f]"
                  style={{ width: `${(column.width || 16) * 10}px` }}
                >
                  {column.label}
                </div>
              ))}
            </div>

            {previewRows.map((row, rowIndex) => {
              const excelRowNumber = rowIndex + 2;

              return (
                <div
                  key={row.id}
                  className="flex border-b border-[var(--color-border)] last:border-b-0"
                >
                  <div className="flex min-h-16 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#f6f8fa] text-xs font-semibold text-[#61707b]">
                    {excelRowNumber}
                  </div>
                  {visibleLayout.map((column) => {
                    const formulaPreview = getFormulaPreview(
                      visibleLayout,
                      column.key,
                      excelRowNumber,
                    );

                    return (
                      <div
                        key={`${row.id}_${column.key}`}
                        className="min-h-16 border-r border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)] last:border-r-0"
                        style={{ width: `${(column.width || 16) * 10}px` }}
                      >
                        <div className="truncate">
                          {String(getPreviewCellValue(row, column.key))}
                        </div>
                        {formulaPreview ? (
                          <div className="mt-1 truncate font-mono text-[11px] text-[var(--color-muted-foreground)]">
                            ={formulaPreview.split(" = ")[1]}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
