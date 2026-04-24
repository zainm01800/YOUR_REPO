"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BarChart2, CheckCheck, Eye, EyeOff, FileSpreadsheet, Files, GripVertical, ListTree, Lock, Loader2, Redo2, SlidersHorizontal, Undo2, Unlock, X } from "lucide-react";
import type {
  BankStatementSummary,
  ReconciliationRun,
  ReviewActionType,
  ReviewGridColumnLayout,
  ReviewRow,
  ReviewTableTemplate,
} from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentAttachmentPanel } from "@/components/review/document-attachment-panel";
import { BankSourceCard } from "@/components/review/bank-source-card";
import { ReviewActions } from "@/components/review/review-actions";
import { ReviewDetailPanel } from "@/components/review/review-detail-panel";
import { ReviewTable } from "@/components/review/review-table";
import { ExportRunModal } from "@/components/export/export-run-modal";
import { buildRunSummary } from "@/lib/reconciliation/summary";
import { getReviewCellDisplayValue, getReviewCellFilterText } from "@/lib/review-sheet";
import {
  cloneReviewColumns,
  createDefaultReviewTemplate,
  defaultReviewTemplateId,
  normaliseReviewTemplates,
  reviewTemplateStorageKey,
} from "@/lib/review-templates";
import { deepClone } from "@/lib/utils";

const editableFieldKeys = [
  "supplier",
  "originalValue",
  "gross",
  "net",
  "vat",
  "vatPercent",
  "vatCode",
  "glCode",
] as const;

type EditableFieldKey = (typeof editableFieldKeys)[number];

type WorkspaceSnapshot = {
  rows: ReviewRow[];
  columns: ReviewGridColumnLayout[];
  selectedTemplateId: string;
};

type SidebarTab = "template" | "documents" | "detail" | "actions";
type SaveState = "idle" | "saving" | "saved";
type SortDirection = "asc" | "desc";

function moveColumn(
  columns: ReviewGridColumnLayout[],
  fromIndex: number,
  toIndex: number,
) {
  const next = [...columns];
  const [column] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, column);
  return next;
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function patchRowValue(row: ReviewRow, field: string, value: string): ReviewRow {
  switch (field) {
    case "supplier":
      return { ...row, supplier: value };
    case "originalValue": {
      const originalAmount = toOptionalNumber(value);
      return originalAmount === undefined ? row : { ...row, originalAmount };
    }
    case "date":
      return { ...row, date: value };
    case "gross": {
      const gross = toOptionalNumber(value);
      if (gross === undefined) {
        return { ...row, gross: undefined };
      }

      const nextVat =
        row.net !== undefined ? Number((gross - row.net).toFixed(2)) : row.vat;
      const nextVatPercent =
        row.net !== undefined && nextVat !== undefined && row.net !== 0
          ? Number(((nextVat / row.net) * 100).toFixed(1))
          : row.vatPercent;
      return { ...row, gross, vat: nextVat, vatPercent: nextVatPercent };
    }
    case "net": {
      const net = toOptionalNumber(value);
      if (net === undefined) {
        return { ...row, net: undefined };
      }

      const nextVat =
        row.gross !== undefined ? Number((row.gross - net).toFixed(2)) : row.vat;
      const nextVatPercent =
        nextVat !== undefined && net !== 0
          ? Number(((nextVat / net) * 100).toFixed(1))
          : row.vatPercent;
      return { ...row, net, vat: nextVat, vatPercent: nextVatPercent };
    }
    case "vat": {
      const vat = toOptionalNumber(value);
      if (vat === undefined) {
        return { ...row, vat: undefined };
      }

      const nextNet =
        row.gross !== undefined ? Number((row.gross - vat).toFixed(2)) : row.net;
      const nextVatPercent =
        nextNet !== undefined && nextNet !== 0
          ? Number(((vat / nextNet) * 100).toFixed(1))
          : row.vatPercent;
      return { ...row, vat, net: nextNet, vatPercent: nextVatPercent };
    }
    case "vatPercent": {
      const vatPercent = toOptionalNumber(value);
      if (vatPercent === undefined) {
        return { ...row, vatPercent: undefined };
      }

      if (row.net !== undefined) {
        const vat = Number((row.net * (vatPercent / 100)).toFixed(2));
        const gross = Number((row.net + vat).toFixed(2));
        return { ...row, vatPercent, vat, gross };
      }

      if (row.gross !== undefined) {
        const net = Number((row.gross / (1 + vatPercent / 100)).toFixed(2));
        const vat = Number((row.gross - net).toFixed(2));
        return { ...row, vatPercent, net, vat };
      }

      return { ...row, vatPercent };
    }
    case "glCode":
      return { ...row, glCode: value };
    case "vatCode":
      return { ...row, vatCode: value };
    case "originalDescription":
      return { ...row, originalDescription: value };
    case "notes":
      return { ...row, notes: value };
    default:
      return row;
  }
}

function getFieldValue(row: ReviewRow, field: EditableFieldKey) {
  switch (field) {
    case "originalValue":
      return row.originalAmount;
    default:
      return row[field];
  }
}

function toFieldPayloadValue(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

export function ReviewWorkspace({
  run,
  initialRows,
  initialRowId,
  bankStatements,
}: {
  run: ReconciliationRun;
  initialRows: ReviewRow[];
  initialRowId?: string;
  bankStatements: BankStatementSummary[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [runDocuments, setRunDocuments] = useState(run.documents);
  const [bankSourceMode, setBankSourceMode] = useState(run.bankSourceMode);
  const [bankStatementId, setBankStatementId] = useState(run.bankStatementId);
  const [bankSourceLabel, setBankSourceLabel] = useState(run.bankSourceLabel);
  const [selectedRowId, setSelectedRowId] = useState(initialRowId || initialRows[0]?.id || "");
  const [templates, setTemplates] = useState<ReviewTableTemplate[]>(() =>
    normaliseReviewTemplates(),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultReviewTemplateId);
  const [columns, setColumns] = useState<ReviewGridColumnLayout[]>(() =>
    cloneReviewColumns(createDefaultReviewTemplate().columns),
  );
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterColumnKey, setActiveFilterColumnKey] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("template");
  const [isTableEditingEnabled, setIsTableEditingEnabled] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [historyPast, setHistoryPast] = useState<WorkspaceSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkspaceSnapshot[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, startTransition] = useTransition();
  const [colDragIndex, setColDragIndex] = useState<number | null>(null);
  const [colDragOver, setColDragOver] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkGlCode, setBulkGlCode] = useState("");
  const [showBulkGlInput, setShowBulkGlInput] = useState(false);
  const [isLocked, setIsLocked] = useState(run.locked ?? false);
  const [isLocking, startLockTransition] = useTransition();
  const [sortColumnKey, setSortColumnKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setRunDocuments(run.documents);
  }, [run.documents]);

  useEffect(() => {
    if (initialRowId) {
      setSelectedRowId(initialRowId);
    }
  }, [initialRowId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTemplates = window.localStorage.getItem(reviewTemplateStorageKey);
    if (!storedTemplates) {
      setTemplates(normaliseReviewTemplates());
      return;
    }

    try {
      const parsed = JSON.parse(storedTemplates) as ReviewTableTemplate[];
      setTemplates(normaliseReviewTemplates(parsed));
    } catch {
      setTemplates(normaliseReviewTemplates());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(reviewTemplateStorageKey, JSON.stringify(templates));
  }, [templates]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row, index) =>
        Object.entries(columnFilters).every(([columnKey, filterValue]) => {
          if (!filterValue.trim()) {
            return true;
          }

          const column = columns.find((candidate) => candidate.key === columnKey);
          if (!column) {
            return true;
          }

          return getReviewCellFilterText(
            row,
            column,
            columns.filter((candidate) => candidate.visible),
            index + 2,
          ).includes(filterValue.toLowerCase());
        }),
      ),
    [columnFilters, columns, rows],
  );

  const sortedRows = useMemo(() => {
    if (!sortColumnKey) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.key === sortColumnKey);
    if (!sortColumn) {
      return filteredRows;
    }

    const numericColumns = new Set([
      "originalValue",
      "gross",
      "net",
      "vat",
      "vatPercent",
      "confidence",
    ]);

    const getComparableValue = (row: ReviewRow, rowIndex: number) => {
      if (numericColumns.has(sortColumn.key)) {
        switch (sortColumn.key) {
          case "originalValue":
            return row.originalAmount ?? 0;
          case "gross":
            return row.grossInRunCurrency ?? row.gross ?? 0;
          case "net":
            return row.netInRunCurrency ?? row.net ?? 0;
          case "vat":
            return row.vatInRunCurrency ?? row.vat ?? 0;
          case "vatPercent":
            return row.vatPercent ?? -1;
          case "confidence":
            return row.confidence ?? -1;
          default:
            return 0;
        }
      }

      if (sortColumn.key === "date") {
        return row.date ? new Date(row.date).getTime() : 0;
      }

      return String(
        getReviewCellDisplayValue(row, sortColumn, columns.filter((candidate) => candidate.visible), rowIndex + 2),
      ).toLowerCase();
    };

    return [...filteredRows].sort((left, right) => {
      const leftIndex = filteredRows.findIndex((candidate) => candidate.id === left.id);
      const rightIndex = filteredRows.findIndex((candidate) => candidate.id === right.id);
      const leftValue = getComparableValue(left, leftIndex);
      const rightValue = getComparableValue(right, rightIndex);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortDirection === "asc"
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [columns, filteredRows, sortColumnKey, sortDirection]);

  useEffect(() => {
    if (sortedRows.length === 0) {
      setSelectedRowId("");
      return;
    }

    if (!sortedRows.some((candidate) => candidate.id === selectedRowId)) {
      setSelectedRowId(sortedRows[0].id);
    }
  }, [selectedRowId, sortedRows]);

  const selectedRow =
    sortedRows.find((candidate) => candidate.id === selectedRowId) ||
    rows.find((candidate) => candidate.id === selectedRowId) ||
    sortedRows[0];
  const summary = useMemo(() => buildRunSummary(rows), [rows]);
  const hasPendingChanges = saveState === "saving" || pending || isLocking;

  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingChanges]);

  // Approval progress
  const approvedCount = useMemo(() => rows.filter((r) => r.approved).length, [rows]);
  const totalCount = rows.length;
  const approvalPct = useMemo(
    () => (totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0),
    [approvedCount, totalCount],
  );

  const createSnapshot = useCallback((): WorkspaceSnapshot => {
    return {
      rows: deepClone(rows),
      columns: deepClone(columns),
      selectedTemplateId,
    };
  }, [columns, rows, selectedTemplateId]);

  const commitSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    setRows(snapshot.rows);
    setColumns(snapshot.columns);
    setSelectedTemplateId(snapshot.selectedTemplateId);
  }, []);

  const rememberCurrentState = useCallback(() => {
    setHistoryPast((current) => [...current.slice(-39), createSnapshot()]);
    setHistoryFuture([]);
  }, [createSnapshot]);

  const submitMutation = useCallback(async (
    rowId: string,
    actionType: ReviewActionType,
    value?: string,
    field?: string,
  ) => {
    await fetch(`/api/runs/${run.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: run.id,
        rowId,
        actionType,
        field,
        value,
      }),
    });
  }, [run.id]);

  const syncRowsToServer = useCallback((previousRows: ReviewRow[], nextRows: ReviewRow[]) => {
    const previousById = new Map(previousRows.map((row) => [row.id, row]));

    setSaveState("saving");
    startTransition(async () => {
      const tasks: Promise<void>[] = [];

      for (const nextRow of nextRows) {
        const previousRow = previousById.get(nextRow.id);
        if (!previousRow) {
          continue;
        }

        for (const field of editableFieldKeys) {
          const previousValue = getFieldValue(previousRow, field);
          const nextValue = getFieldValue(nextRow, field);

          if (previousValue === nextValue) {
            continue;
          }

          tasks.push(
            submitMutation(
              nextRow.id,
              "edit_field",
              toFieldPayloadValue(nextValue),
              field,
            ),
          );
        }
      }

      await Promise.all(tasks);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    });
  }, [startTransition, submitMutation]);

  const handleEditField = useCallback((rowId: string, field: string, value: string) => {
    const previousRows = deepClone(rows);
    const nextRows = previousRows.map((row) =>
      row.id === rowId ? patchRowValue(row, field, value) : row,
    );

    rememberCurrentState();
    setRows(nextRows);
    syncRowsToServer(previousRows, nextRows);
  }, [rememberCurrentState, rows, syncRowsToServer]);

  function handleActionComplete(actionType: ReviewActionType, value?: string) {
    if (!selectedRow) {
      return;
    }

    setRows((current) =>
      current.map((row) => {
        if (row.id !== selectedRow.id) {
          return row;
        }

        switch (actionType) {
          case "override_gl_code":
            return { ...row, glCode: value };
          case "override_vat_code":
            return { ...row, vatCode: value };
          case "edit_field":
            return { ...row, notes: value };
          case "exclude_from_export":
            return { ...row, excludedFromExport: true };
          case "approve":
            return { ...row, approved: true };
          default:
            return row;
        }
      }),
    );
  }

  const handleToggleRowSelect = useCallback((rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const handleToggleSort = useCallback((columnKey: string) => {
    if (sortColumnKey === columnKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnKey(columnKey);
    setSortDirection("asc");
  }, [sortColumnKey]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  async function handleBulkApproveSelected() {
    const targets = filteredRows.filter((r) => selectedRowIds.has(r.id) && !r.approved);
    if (targets.length === 0) return;
    setSaveState("saving");
    await Promise.all(targets.map((r) => submitMutation(r.id, "approve")));
    setRows((current) => current.map((r) => selectedRowIds.has(r.id) ? { ...r, approved: true } : r));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
    setSelectedRowIds(new Set());
  }

  async function handleBulkGlAssign() {
    const code = bulkGlCode.trim();
    if (!code) return;
    const targets = filteredRows.filter((r) => selectedRowIds.has(r.id));
    if (targets.length === 0) return;
    setSaveState("saving");
    await Promise.all(targets.map((r) => submitMutation(r.id, "override_gl_code", code, "glCode")));
    setRows((current) => current.map((r) => selectedRowIds.has(r.id) ? { ...r, glCode: code } : r));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
    setBulkGlCode("");
    setShowBulkGlInput(false);
    setSelectedRowIds(new Set());
  }

  async function handleBulkExclude() {
    const targets = filteredRows.filter((r) => selectedRowIds.has(r.id) && !r.excludedFromExport);
    if (targets.length === 0) return;
    setSaveState("saving");
    await Promise.all(targets.map((r) => submitMutation(r.id, "exclude_from_export")));
    setRows((current) => current.map((r) => selectedRowIds.has(r.id) ? { ...r, excludedFromExport: true } : r));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
    setSelectedRowIds(new Set());
  }

  function handleLockRun() {
    startLockTransition(async () => {
      await fetch(`/api/runs/${run.id}/lock`, { method: "POST" });
      setIsLocked(true);
    });
  }

  function handleUnlockRun() {
    startLockTransition(async () => {
      await fetch(`/api/runs/${run.id}/lock`, { method: "DELETE" });
      setIsLocked(false);
    });
  }

  async function handleBulkApproveMatched() {
    const matchedRows = rows.filter(
      (r) => r.matchStatus === "matched" && !r.approved,
    );
    if (matchedRows.length === 0) return;

    setSaveState("saving");
    await Promise.all(
      matchedRows.map((r) => submitMutation(r.id, "approve")),
    );
    setRows((current) =>
      current.map((r) =>
        r.matchStatus === "matched" ? { ...r, approved: true } : r,
      ),
    );
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  const handleSelectTemplate = useCallback((templateId: string) => {
    const nextTemplate = templates.find((template) => template.id === templateId);
    if (!nextTemplate) {
      return;
    }

    rememberCurrentState();
    setSelectedTemplateId(nextTemplate.id);
    setColumns(cloneReviewColumns(nextTemplate.columns));
  }, [rememberCurrentState, templates]);

  const handleUndo = useCallback(() => {
    const previousSnapshot = historyPast.at(-1);
    if (!previousSnapshot) {
      return;
    }

    const currentSnapshot = createSnapshot();
    const previousRows = rows;

    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [...current, currentSnapshot]);
    commitSnapshot(previousSnapshot);
    syncRowsToServer(previousRows, previousSnapshot.rows);
  }, [commitSnapshot, createSnapshot, historyPast, rows, syncRowsToServer]);

  const handleRedo = useCallback(() => {
    const nextSnapshot = historyFuture.at(-1);
    if (!nextSnapshot) {
      return;
    }

    const currentSnapshot = createSnapshot();
    const previousRows = rows;

    setHistoryFuture((current) => current.slice(0, -1));
    setHistoryPast((current) => [...current, currentSnapshot]);
    commitSnapshot(nextSnapshot);
    syncRowsToServer(previousRows, nextSnapshot.rows);
  }, [commitSnapshot, createSnapshot, historyFuture, rows, syncRowsToServer]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      if (!ctrlOrCmd) return;
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        handleRedo();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyPast, historyFuture, rows],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const sidebarTabs: Array<{
    id: SidebarTab;
    label: string;
    icon: typeof FileSpreadsheet;
    disabled?: boolean;
  }> = [
    { id: "template", label: "Template", icon: FileSpreadsheet },
    { id: "documents", label: "Docs", icon: Files, disabled: !selectedRow },
    { id: "detail", label: "Detail", icon: ListTree, disabled: !selectedRow },
    { id: "actions", label: "Actions", icon: SlidersHorizontal, disabled: !selectedRow },
  ];

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleMoveColumn = useCallback((fromIndex: number, toIndex: number) => {
    rememberCurrentState();
    setColumns((current) => moveColumn(current, fromIndex, toIndex));
  }, [rememberCurrentState]);

  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    setColumnFilters((current) => ({ ...current, [columnKey]: value }));
  }, []);

  const handleToggleFilterMenu = useCallback((columnKey: string | null) => {
    setActiveFilterColumnKey(columnKey);
  }, []);

  function renderSidebarPanel() {
    if (sidebarTab === "template") {
      const visibleCount = columns.filter((c) => c.visible).length;
      return (
        <div className="space-y-3">
          {/* Template selector + quick toggles */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">Template</span>
              <select
                className="h-8 max-w-[160px] flex-1 rounded-xl border border-[var(--color-border)] bg-white px-2.5 text-sm text-[var(--color-foreground)]"
                value={selectedTemplateId}
                onChange={(event) => handleSelectTemplate(event.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {visibleCount} of {columns.length} visible
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-panel)]"
                  onClick={() =>
                    setColumns((cols) => cols.map((c) => ({ ...c, visible: true })))
                  }
                >
                  Show all
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-panel)]"
                  onClick={() =>
                    setColumns((cols) => cols.map((c) => ({ ...c, visible: false })))
                  }
                >
                  Hide all
                </button>
              </div>
            </div>
          </Card>

          {/* Column visibility + drag-to-reorder */}
          <Card className="overflow-hidden p-0">
            {/* ── Visible columns (draggable) ─────────────────────────── */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                Visible · drag to reorder
              </span>
            </div>
            <div className="flex flex-col">
              {columns.map((col, i) => {
                if (!col.visible) return null;
                const isDragging = colDragIndex === i;
                const isDropTarget = colDragOver === i && colDragIndex !== null && colDragIndex !== i;

                return (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={() => { setColDragIndex(i); setColDragOver(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (colDragIndex !== null && colDragIndex !== i) setColDragOver(i);
                    }}
                    onDragLeave={() => { if (colDragOver === i) setColDragOver(null); }}
                    onDrop={() => {
                      if (colDragIndex !== null && colDragIndex !== i) {
                        rememberCurrentState();
                        setColumns((cols) => moveColumn(cols, colDragIndex, i));
                      }
                      setColDragIndex(null);
                      setColDragOver(null);
                    }}
                    onDragEnd={() => { setColDragIndex(null); setColDragOver(null); }}
                    className={[
                      "group relative flex select-none items-center gap-2 border-t px-2.5 py-2.5 transition-colors first:border-t-0 bg-white hover:bg-[var(--color-accent-soft)]/30",
                      isDragging ? "opacity-30 bg-[var(--color-panel)]" : "",
                      isDropTarget ? "border-t-2 border-t-[var(--color-accent)]" : "border-t-[var(--color-border)]",
                    ].join(" ")}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--color-muted-foreground)] opacity-40 group-hover:opacity-100 active:cursor-grabbing" />
                    <button
                      type="button"
                      onClick={() => setColumns((cols) => cols.map((c, ci) => ci === i ? { ...c, visible: false } : c))}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-soft)]"
                      title="Hide column"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                      {col.label}
                    </span>
                  </div>
                );
              })}
              {columns.filter((c) => c.visible).length === 0 && (
                <p className="px-3 py-4 text-xs text-[var(--color-muted-foreground)]">
                  All columns hidden. Use the section below to show some.
                </p>
              )}
            </div>

            {/* ── Hidden columns ──────────────────────────────────────── */}
            {columns.some((c) => !c.visible) && (
              <>
                <div className="border-y border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Hidden
                  </span>
                </div>
                <div className="flex flex-col">
                  {columns.map((col, i) => {
                    if (col.visible) return null;
                    return (
                      <div
                        key={col.key}
                        className="group flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-2 first:border-t-0 hover:bg-[var(--color-border)]/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setColumns((cols) => cols.map((c, ci) => ci === i ? { ...c, visible: true } : c))}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-accent)]"
                          title="Show column"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted-foreground)]">
                          {col.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setColumns((cols) => cols.map((c, ci) => ci === i ? { ...c, visible: true } : c))}
                          className="shrink-0 rounded-md border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                          show
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          {/* Template management */}
          <Link href="/templates">
            <Button type="button" variant="secondary" className="w-full text-sm">
              Manage saved templates
            </Button>
          </Link>
        </div>
      );
    }

    if (!selectedRow) {
      return (
        <Card>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            No rows match the current filter.
          </p>
        </Card>
      );
    }

    if (sidebarTab === "documents") {
      return (
            <DocumentAttachmentPanel
              key={`documents_${selectedRow.id}`}
              runId={run.id}
              row={selectedRow}
              rows={rows}
              documents={runDocuments}
              onSelectRow={setSelectedRowId}
              onDocumentLinked={({
                linkedDocumentId,
                updatedRows,
                updatedDocuments,
                affectedTransactionIds,
              }) => {
                setRunDocuments(updatedDocuments);
                setRows(updatedRows);

                const nextSelectedRow =
                  (linkedDocumentId
                    ? updatedRows.find((candidate) => candidate.documentId === linkedDocumentId)
                    : undefined) ||
                  (affectedTransactionIds && affectedTransactionIds.length > 0
                    ? updatedRows.find((candidate) =>
                        affectedTransactionIds.includes(candidate.transactionId),
                      )
                    : undefined) ||
                  updatedRows.find((candidate) => candidate.id === selectedRow.id) ||
                  updatedRows[0];

                setSelectedRowId(nextSelectedRow?.id || "");
              }}
            />
          );
        }

        if (sidebarTab === "detail") {
      return (
        <ReviewDetailPanel
          row={selectedRow}
          rows={rows}
          run={{ ...run, documents: runDocuments }}
          runId={run.id}
          onRunMutated={(payload) => {
            if (payload.rows) {
              setRows(payload.rows);
            }

            if (payload.run?.documents) {
              setRunDocuments(payload.run.documents);
            }

            const nextSelectedRow =
              payload.rows?.find((candidate) => candidate.id === selectedRow.id) ||
              payload.rows?.[0];
            if (nextSelectedRow) {
              setSelectedRowId(nextSelectedRow.id);
            }
          }}
          onEditField={handleEditField}
        />
      );
        }

    return (
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Manual overrides</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Finance remains in control of approvals, VAT coding, GL coding, and export inclusion.
          </p>
        </div>
        <ReviewActions
          key={selectedRow.id}
          runId={run.id}
          row={selectedRow}
          isLocked={isLocked}
          onActionComplete={handleActionComplete}
        />
      </Card>
    );
  }

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const undoShortcut = isMac ? "⌘Z" : "Ctrl+Z";
  const redoShortcut = isMac ? "⌘⇧Z" : "Ctrl+Y";

  const matchedUnapprovedCount = rows.filter(
    (r) => r.matchStatus === "matched" && !r.approved,
  ).length;

  const reviewTableNode = useMemo(() => {
    if (sortedRows.length === 0) {
      return (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Nothing to review in this run</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              This run does not currently have review rows. That usually means there were no imported transactions,
              everything has already been carried through export, or the current filters removed all rows from view.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setColumnFilters({})}>
              Clear table filters
            </Button>
            <Link href="/runs">
              <Button>Back to runs</Button>
            </Link>
          </div>
        </Card>
      );
    }

    return (
      <ReviewTable
        rows={sortedRows}
        columns={columns}
        selectedRowId={selectedRowId}
        selectedRowIds={selectedRowIds}
        columnFilters={columnFilters}
        activeFilterColumnKey={activeFilterColumnKey}
        sortColumnKey={sortColumnKey}
        sortDirection={sortDirection}
        onSelectRow={handleSelectRow}
        onToggleRowSelect={handleToggleRowSelect}
        onEditField={handleEditField}
        onToggleSort={handleToggleSort}
        onMoveColumn={handleMoveColumn}
        onFilterChange={handleFilterChange}
        onToggleFilterMenu={handleToggleFilterMenu}
        isTableEditingEnabled={isTableEditingEnabled}
        pending={pending}
      />
    );
  }, [
    activeFilterColumnKey,
    columnFilters,
    columns,
    handleEditField,
    handleFilterChange,
    handleMoveColumn,
    handleSelectRow,
    handleToggleFilterMenu,
    handleToggleRowSelect,
    handleToggleSort,
    isTableEditingEnabled,
    pending,
    selectedRowId,
    selectedRowIds,
    sortColumnKey,
    sortDirection,
    sortedRows,
  ]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 overflow-x-hidden space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="md:col-span-3 p-5 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Run Progress</h3>
                <div className="flex items-center gap-4 text-xs font-semibold">
                   <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> {summary.matched} Matched</div>
                   <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /> {summary.exceptions} Broken</div>
                   <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> {summary.probable} Review</div>
                </div>
             </div>
             <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--color-panel)] flex shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out border-r border-white/20" 
                  style={{ width: `${(summary.matched / totalCount) * 100}%` }} 
                />
                <div 
                  className="h-full bg-rose-500 transition-all duration-500 ease-out border-r border-white/20" 
                  style={{ width: `${(summary.exceptions / totalCount) * 100}%` }} 
                />
                <div 
                  className="h-full bg-amber-500 transition-all duration-500 ease-out border-r border-white/20" 
                  style={{ width: `${(summary.probable / totalCount) * 100}%` }} 
                />
                <div 
                  className="h-full bg-orange-400 transition-all duration-500 ease-out" 
                  style={{ width: `${((summary.unmatched + summary.duplicates) / totalCount) * 100}%` }} 
                />
             </div>
             <div className="flex justify-between text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">
                <span>0% Progress</span>
                <span className="text-emerald-600">{Math.round((summary.matched / totalCount) * 100)}% Matched</span>
                <span>100%</span>
             </div>
          </Card>

          <Card className="flex flex-col justify-between border-[var(--accent-soft)] bg-[var(--accent-softer)] p-5 shadow-sm">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Approval</span>
                <CheckCheck className={`h-4 w-4 ${approvalPct === 100 ? "text-emerald-500" : "text-[var(--accent-ink)] opacity-40"}`} />
             </div>
             <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-[var(--ink)]">{approvalPct}%</span>
                <span className="text-xs font-bold text-[var(--muted)]">Approved</span>
             </div>
             <Button 
               variant="secondary" 
               className="mt-4 h-8 rounded-lg border-[var(--line)] bg-white text-[10px] font-bold uppercase tracking-wider text-[var(--accent-ink)] hover:bg-[var(--accent-softer)]"
              disabled={approvalPct === 100 || isLocked}
              onClick={handleBulkApproveMatched}
             >
                Approve Matched ({summary.matched})
             </Button>
          </Card>
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Lock className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="flex-1 text-sm font-semibold text-emerald-700">
              Period locked — this run is read-only. Unlock to make changes.
            </span>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={isLocking}
              onClick={handleUnlockRun}
            >
              {isLocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Unlock className="mr-1.5 h-3 w-3" />Unlock</>}
            </Button>
          </div>
        )}

        <BankSourceCard
          runId={run.id}
          bankStatements={bankStatements}
          currentBankStatementId={bankStatementId}
          currentBankSourceMode={bankSourceMode}
          currentBankSourceLabel={bankSourceLabel}
          onAttached={({ rows: updatedRows, run: updatedRun }) => {
            setRows(updatedRows);
            setBankStatementId(updatedRun.bankStatementId);
            setBankSourceMode(updatedRun.bankSourceMode);
            setBankSourceLabel(updatedRun.bankSourceLabel);
            setSelectedRowId(updatedRows[0]?.id || "");
          }}
        />

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Sheet controls
            </div>
            <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {templates.find((template) => template.id === selectedTemplateId)?.name || "Default"} template active
              {run.period && <span className="ml-3 rounded-lg bg-[var(--color-panel)] px-2 py-0.5 text-xs">Period: {run.period}</span>}
              {bankSourceLabel && <span className="ml-3 rounded-lg bg-[var(--color-panel)] px-2 py-0.5 text-xs">Bank source: {bankSourceLabel}</span>}
            </div>
            <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {isTableEditingEnabled
                ? "Inline editing is on. Click a supported cell to change it."
                : "Inline editing is off. Turn on Edit table before changing cells."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isLocked && (
              <Button
                type="button"
                variant={isTableEditingEnabled ? "primary" : "secondary"}
                onClick={() => setIsTableEditingEnabled((current) => !current)}
              >
                {isTableEditingEnabled ? "Finish editing" : "Edit table"}
              </Button>
            )}
            <Button type="button" onClick={() => setIsExportModalOpen(true)}>
              Export run
            </Button>
            <Link href={`/runs/${run.id}/vat-summary`}>
              <Button type="button" variant="secondary">
                <BarChart2 className="mr-2 h-4 w-4" />
                VAT summary
              </Button>
            </Link>
            {!isLocked && (
              <Button
                type="button"
                variant="secondary"
                disabled={isLocking}
                onClick={handleLockRun}
                title="Lock this period — makes the run read-only"
              >
                {isLocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Lock period
              </Button>
            )}
            <span className={`text-xs font-medium transition-opacity ${saveState === "idle" ? "opacity-0" : "opacity-100"} ${saveState === "saved" ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved ✓"}
            </span>
            {!isLocked && (
              <>
                <Button type="button" variant="secondary" disabled={historyPast.length === 0} onClick={handleUndo} title={`Undo (${undoShortcut})`}>
                  <Undo2 className="mr-2 h-4 w-4" /> Undo
                  <span className="ml-2 rounded bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)]">{undoShortcut}</span>
                </Button>
                <Button type="button" variant="secondary" disabled={historyFuture.length === 0} onClick={handleRedo} title={`Redo (${redoShortcut})`}>
                  <Redo2 className="mr-2 h-4 w-4" /> Redo
                  <span className="ml-2 rounded bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)]">{redoShortcut}</span>
                </Button>
              </>
            )}
            {matchedUnapprovedCount > 0 && !isLocked && (
              <Button type="button" variant="secondary" onClick={handleBulkApproveMatched} title="Approve all rows with a confirmed match">
                <CheckCheck className="mr-2 h-4 w-4" /> Approve matched ({matchedUnapprovedCount})
              </Button>
            )}
          </div>
        </Card>

        {/* Bulk selection action bar */}
        {selectedRowIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-accent)]">
              {selectedRowIds.size} row{selectedRowIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={handleBulkApproveSelected}>
                <CheckCheck className="mr-1.5 h-3 w-3" /> Approve
              </Button>
              {showBulkGlInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="GL code…"
                    value={bulkGlCode}
                    onChange={(e) => setBulkGlCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBulkGlAssign()}
                    className="h-8 w-28 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    autoFocus
                  />
                  <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={handleBulkGlAssign} disabled={!bulkGlCode.trim()}>
                    Apply
                  </Button>
                  <button type="button" onClick={() => setShowBulkGlInput(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={() => setShowBulkGlInput(true)}>
                  Assign GL code
                </Button>
              )}
              <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={handleBulkExclude}>
                Exclude from export
              </Button>
            </div>
            <button type="button" onClick={handleDeselectAll} className="ml-auto text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              Clear selection
            </button>
          </div>
        )}

        {reviewTableNode}
      </div>

      <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col gap-4">
        <Card className="flex shrink-0 gap-1 p-1.5">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = sidebarTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
                } ${tab.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </Card>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {renderSidebarPanel()}
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Next step</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    When the selected row looks right, open the export popup and download the final file.
                  </p>
                </div>
                <Button type="button" onClick={() => setIsExportModalOpen(true)}>
                  Export run
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <ExportRunModal
        runId={run.id}
        rows={rows}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
