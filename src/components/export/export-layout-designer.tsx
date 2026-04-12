"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import type {
  ExportColumnLayout,
  ReviewRow,
  ReviewTableTemplate,
} from "@/lib/domain/types";
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
import {
  mapReviewTemplateToExportLayout,
  normaliseReviewTemplates,
  reviewTemplateStorageKey,
} from "@/lib/review-templates";

const PREVIEW_ROW_COUNT = 10;

function moveColumn(columns: ExportColumnLayout[], from: number, to: number) {
  const next = [...columns];
  const [col] = next.splice(from, 1);
  next.splice(to, 0, col);
  return next;
}

function excelCol(n: number) {
  let dividend = n;
  let name = "";
  while (dividend > 0) {
    const mod = (dividend - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    dividend = Math.floor((dividend - mod) / 26);
  }
  return name;
}

function getFormulaPreview(
  visibleLayout: ExportColumnLayout[],
  key: ExportColumnLayout["key"],
  rowNum: number,
) {
  const ci = visibleLayout.findIndex((c) => c.key === key);
  const ni = visibleLayout.findIndex((c) => c.key === "net");
  const vi = visibleLayout.findIndex((c) => c.key === "vat");
  if (ci < 0 || ni < 0 || vi < 0) return null;
  const cc = excelCol(ci + 1);
  const nc = excelCol(ni + 1);
  const vc = excelCol(vi + 1);
  if (key === "gross") return `${cc}${rowNum} = ${nc}${rowNum} + ${vc}${rowNum}`;
  if (key === "vatPercent") return `${cc}${rowNum} = ${vc}${rowNum} / ${nc}${rowNum}`;
  return null;
}

function ColumnRow({
  column,
  index,
  total,
  isExpanded,
  onToggleExpand,
  onVisibilityChange,
  onMove,
  onLabelChange,
  onWidthChange,
}: {
  column: ExportColumnLayout;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onVisibilityChange: (visible: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onLabelChange: (label: string) => void;
  onWidthChange: (width: number) => void;
}) {
  return (
    <div className={`rounded-2xl border transition-colors ${column.visible ? "border-[var(--color-border)] bg-white" : "border-dashed border-[var(--color-border)] bg-[var(--color-panel)] opacity-60"}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle (visual only) */}
        <GripVertical className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => onVisibilityChange(!column.visible)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${column.visible ? "text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"}`}
          title={column.visible ? "Hide column" : "Show column"}
        >
          {column.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>

        {/* Column name */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-[var(--color-foreground)]">
            {column.label || column.key}
          </span>
          {column.label !== column.key && (
            <span className="truncate text-xs text-[var(--color-muted-foreground)]">{column.key}</span>
          )}
        </div>

        {/* Width badge */}
        {column.visible && (
          <span className="shrink-0 rounded-md bg-[var(--color-panel)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
            {column.width || 16}ch
          </span>
        )}

        {/* Reorder */}
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--color-panel)] disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--color-panel)] disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-[var(--color-panel)]"
          title="Edit label and width"
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          )}
        </button>
      </div>

      {/* Expanded edit area */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] px-3 pb-3 pt-2.5">
          <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
            <label className="space-y-1">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Column label</span>
              <Input
                value={column.label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="Column label"
                className="h-9 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Width (ch)</span>
              <Input
                type="number"
                min={8}
                max={60}
                value={column.width || 16}
                onChange={(e) => onWidthChange(Number(e.target.value || 16))}
                className="h-9 text-sm"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExportLayoutDesigner({
  runId,
  rows,
  totalRowCount,
}: {
  runId: string;
  rows: ReviewRow[];
  totalRowCount: number;
}) {
  const [reviewTemplates, setReviewTemplates] = useState<ReviewTableTemplate[]>(
    () => normaliseReviewTemplates(),
  );
  const [layout, setLayout] = useState<ExportColumnLayout[]>(
    normaliseExportLayout(defaultExportLayout),
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAllPreview, setShowAllPreview] = useState(false);

  const visibleLayout = useMemo(() => getVisibleExportLayout(layout), [layout]);
  const exportableRows = useMemo(() => rows.filter((r) => !r.excludedFromExport), [rows]);
  const previewRows = showAllPreview
    ? exportableRows
    : exportableRows.slice(0, PREVIEW_ROW_COUNT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(reviewTemplateStorageKey);
    if (!stored) return;
    try {
      setReviewTemplates(normaliseReviewTemplates(JSON.parse(stored) as ReviewTableTemplate[]));
    } catch {
      setReviewTemplates(normaliseReviewTemplates());
    }
  }, []);

  function updateColumn(index: number, updater: (c: ExportColumnLayout) => ExportColumnLayout) {
    setLayout((cur) => cur.map((c, i) => (i === index ? updater(c) : c)));
  }

  function applyPreset(presetId: string) {
    const preset = exportLayoutPresets.find((p) => p.id === presetId);
    if (preset) setLayout(normaliseExportLayout(preset.layout));
  }

  function applyReviewTemplate(templateId: string) {
    const template = reviewTemplates.find((t) => t.id === templateId);
    if (template) {
      setLayout((cur) =>
        normaliseExportLayout(mapReviewTemplateToExportLayout(template, cur)),
      );
    }
  }

  async function download(format: "csv" | "xlsx") {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/runs/${runId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, layout }),
      });
      if (!response.ok) return;
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

  const visibleCount = layout.filter((c) => c.visible).length;
  const hiddenCount = layout.length - visibleCount;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.55fr_1.45fr]">
      {/* ── Left: Layout editor ─────────────────────────────────────── */}
      <Card className="flex flex-col gap-5">
        {/* Header + download */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Export layout</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--color-muted-foreground)]">
                Toggle columns, reorder, and rename. Click ↕ to edit label and width.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 shrink-0 px-3 text-xs"
              onClick={() => {
                setLayout(normaliseExportLayout(defaultExportLayout));
                setExpandedKey(null);
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {/* Download buttons — prominent at the top */}
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              className="flex-1"
              disabled={isDownloading}
              onClick={() => download("xlsx")}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading…" : "Download .xlsx"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={isDownloading}
              onClick={() => download("csv")}
            >
              <Download className="mr-2 h-4 w-4" />
              .csv
            </Button>
          </div>
        </div>

        {/* Presets */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Layout preset
            </span>
            <select
              className="h-10 w-full rounded-2xl border border-[var(--color-border)] bg-white px-3 text-sm"
              onChange={(e) => applyPreset(e.target.value)}
              defaultValue=""
            >
              <option value="">Choose a preset…</option>
              {exportLayoutPresets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              From review template
            </span>
            <select
              className="h-10 w-full rounded-2xl border border-[var(--color-border)] bg-white px-3 text-sm"
              onChange={(e) => applyReviewTemplate(e.target.value)}
              defaultValue=""
            >
              <option value="">Choose a template…</option>
              {reviewTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Column visibility summary */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
            {visibleCount} visible · {hiddenCount} hidden
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-[var(--color-accent)] hover:underline"
              onClick={() =>
                setLayout((cur) => cur.map((c) => ({ ...c, visible: true })))
              }
            >
              Show all
            </button>
            <span className="text-xs text-[var(--color-muted-foreground)]">·</span>
            <button
              type="button"
              className="text-xs text-[var(--color-muted-foreground)] hover:underline"
              onClick={() =>
                setLayout((cur) => cur.map((c) => ({ ...c, visible: false })))
              }
            >
              Hide all
            </button>
          </div>
        </div>

        {/* Column list */}
        <div className="space-y-1.5">
          {layout.map((column, index) => (
            <ColumnRow
              key={column.key}
              column={column}
              index={index}
              total={layout.length}
              isExpanded={expandedKey === column.key}
              onToggleExpand={() =>
                setExpandedKey(expandedKey === column.key ? null : column.key)
              }
              onVisibilityChange={(visible) =>
                updateColumn(index, (c) => ({ ...c, visible }))
              }
              onMove={(dir) =>
                setLayout((cur) => moveColumn(cur, index, index + dir))
              }
              onLabelChange={(label) =>
                updateColumn(index, (c) => ({ ...c, label }))
              }
              onWidthChange={(width) =>
                updateColumn(index, (c) => ({ ...c, width }))
              }
            />
          ))}
        </div>
      </Card>

      {/* ── Right: Preview table ─────────────────────────────────────── */}
      <Card className="flex flex-col gap-4 overflow-hidden">
        {/* Preview header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
              Excel-style preview
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Mirrors the downloaded workbook — header row, column widths, and formula cells.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Frozen header</Badge>
            <Badge tone="success">Formula cells</Badge>
            <Badge tone="neutral">{visibleLayout.length} col{visibleLayout.length !== 1 ? "s" : ""}</Badge>
            <Badge tone="neutral">
              {exportableRows.length} row{exportableRows.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white">
          <div className="min-w-max">
            {/* Column letter row */}
            <div className="flex border-b border-[var(--color-border)] bg-[#eef2f5]">
              <div className="w-12 shrink-0 border-r border-[var(--color-border)] bg-[#e5eaee]" />
              {visibleLayout.map((col, i) => (
                <div
                  key={`${col.key}_letter`}
                  className="flex h-9 items-center justify-center border-r border-[var(--color-border)] text-[11px] font-semibold text-[#61707b] last:border-r-0"
                  style={{ width: `${(col.width || 16) * 12}px` }}
                >
                  {excelCol(i + 1)}
                </div>
              ))}
            </div>

            {/* Header row */}
            <div className="flex border-b-2 border-[var(--color-border)] bg-[#d4e4da]">
              <div className="flex h-11 w-12 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#e5eaee] text-xs font-bold text-[#61707b]">
                1
              </div>
              {visibleLayout.map((col) => (
                <div
                  key={`${col.key}_header`}
                  className="flex h-11 items-center border-r border-[var(--color-border)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#17343f] last:border-r-0"
                  style={{ width: `${(col.width || 16) * 12}px` }}
                >
                  <span className="truncate">{col.label}</span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {previewRows.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-[var(--color-muted-foreground)]">
                No exportable rows found.
              </div>
            ) : (
              previewRows.map((row, rowIndex) => {
                const excelRow = rowIndex + 2;
                const isUnmatched = row.matchStatus === "unmatched";
                const hasException = row.exceptions.some((e) => e.severity === "high");

                return (
                  <div
                    key={row.id}
                    className={`flex border-b border-[var(--color-border)] last:border-b-0 ${hasException ? "bg-[var(--color-danger-soft)]" : isUnmatched ? "bg-amber-50" : rowIndex % 2 === 1 ? "bg-[#fafcfd]" : "bg-white"}`}
                  >
                    <div
                      className={`flex min-h-[44px] w-12 shrink-0 items-center justify-center border-r border-[var(--color-border)] text-xs font-semibold ${hasException ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : isUnmatched ? "bg-amber-100 text-amber-700" : "bg-[#f6f8fa] text-[#61707b]"}`}
                    >
                      {excelRow}
                    </div>
                    {visibleLayout.map((col) => {
                      const formula = getFormulaPreview(visibleLayout, col.key, excelRow);
                      return (
                        <div
                          key={`${row.id}_${col.key}`}
                          className="min-h-[44px] border-r border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)] last:border-r-0"
                          style={{ width: `${(col.width || 16) * 12}px` }}
                        >
                          <div className="truncate">
                            {String(getPreviewCellValue(row, col.key))}
                          </div>
                          {formula ? (
                            <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
                              ={formula.split(" = ")[1]}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Show more / summary footer */}
        {exportableRows.length > PREVIEW_ROW_COUNT && (
          <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5">
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Showing {previewRows.length} of {exportableRows.length} rows
              {" "}({totalRowCount - exportableRows.length} excluded)
            </span>
            <button
              type="button"
              className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              onClick={() => setShowAllPreview((v) => !v)}
            >
              {showAllPreview ? "Show less" : `Show all ${exportableRows.length} rows`}
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[var(--color-danger-soft)]" />
            Has exceptions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-100" />
            Unmatched
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-emerald-200 bg-[#d4e4da]" />
            Formula cell
          </span>
        </div>
      </Card>
    </div>
  );
}
