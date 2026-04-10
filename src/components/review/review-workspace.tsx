"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCheck, FileSpreadsheet, Files, ListTree, Redo2, SlidersHorizontal, Undo2 } from "lucide-react";
import type {
  ReconciliationRun,
  ReviewActionType,
  ReviewGridColumnLayout,
  ReviewRow,
  ReviewTableTemplate,
} from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentAttachmentPanel } from "@/components/review/document-attachment-panel";
import { ReviewActions } from "@/components/review/review-actions";
import { ReviewDetailPanel } from "@/components/review/review-detail-panel";
import { ReviewTable } from "@/components/review/review-table";
import { buildRunSummary } from "@/lib/reconciliation/summary";
import { getReviewCellFilterText } from "@/lib/review-sheet";
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
}: {
  run: ReconciliationRun;
  initialRows: ReviewRow[];
  initialRowId?: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [runDocuments, setRunDocuments] = useState(run.documents);
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
  const [historyPast, setHistoryPast] = useState<WorkspaceSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkspaceSnapshot[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, startTransition] = useTransition();

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

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedRowId("");
      return;
    }

    if (!filteredRows.some((candidate) => candidate.id === selectedRowId)) {
      setSelectedRowId(filteredRows[0].id);
    }
  }, [filteredRows, selectedRowId]);

  const selectedRow =
    filteredRows.find((candidate) => candidate.id === selectedRowId) ||
    rows.find((candidate) => candidate.id === selectedRowId) ||
    filteredRows[0];
  const summary = buildRunSummary(rows);

  // Approval progress
  const approvedCount = rows.filter((r) => r.approved).length;
  const totalCount = rows.length;
  const approvalPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  function createSnapshot(): WorkspaceSnapshot {
    return {
      rows: deepClone(rows),
      columns: deepClone(columns),
      selectedTemplateId,
    };
  }

  function commitSnapshot(snapshot: WorkspaceSnapshot) {
    setRows(snapshot.rows);
    setColumns(snapshot.columns);
    setSelectedTemplateId(snapshot.selectedTemplateId);
  }

  function rememberCurrentState() {
    setHistoryPast((current) => [...current.slice(-39), createSnapshot()]);
    setHistoryFuture([]);
  }

  async function submitMutation(
    rowId: string,
    actionType: ReviewActionType,
    value?: string,
    field?: string,
  ) {
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
  }

  function syncRowsToServer(previousRows: ReviewRow[], nextRows: ReviewRow[]) {
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
  }

  function handleEditField(rowId: string, field: string, value: string) {
    const previousRows = deepClone(rows);
    const nextRows = previousRows.map((row) =>
      row.id === rowId ? patchRowValue(row, field, value) : row,
    );

    rememberCurrentState();
    setRows(nextRows);
    syncRowsToServer(previousRows, nextRows);
  }

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

  function handleSelectTemplate(templateId: string) {
    const nextTemplate = templates.find((template) => template.id === templateId);
    if (!nextTemplate) {
      return;
    }

    rememberCurrentState();
    setSelectedTemplateId(nextTemplate.id);
    setColumns(cloneReviewColumns(nextTemplate.columns));
  }

  function handleUndo() {
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
  }

  function handleRedo() {
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
  }

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

  function renderSidebarPanel() {
    if (sidebarTab === "template") {
      return (
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Template</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Choose a saved template to control which columns appear in the review table.
            </p>
          </div>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Active template
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)]"
              value={selectedTemplateId}
              onChange={(event) => handleSelectTemplate(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <Link href="/templates">
            <Button type="button" variant="secondary" className="w-full">
              Manage templates
            </Button>
          </Link>
        </Card>
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
      return <ReviewDetailPanel row={selectedRow} run={{ ...run, documents: runDocuments }} />;
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

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 overflow-x-hidden space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Matched</div>
            <div className="mt-3 text-4xl font-semibold">{summary.matched}</div>
          </Card>
          <Card>
            <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Needs review</div>
            <div className="mt-3 text-4xl font-semibold">{summary.exceptions}</div>
          </Card>
          <Card>
            <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Duplicates</div>
            <div className="mt-3 text-4xl font-semibold">{summary.duplicates}</div>
          </Card>
          <Card>
            <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Unmatched</div>
            <div className="mt-3 text-4xl font-semibold">{summary.unmatched}</div>
          </Card>
        </div>

        {/* Approval progress bar */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-muted-foreground)]">Approval progress</span>
            <span className={`font-semibold ${approvedCount === totalCount && totalCount > 0 ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}`}>
              {approvedCount} / {totalCount} approved
              {approvedCount === totalCount && totalCount > 0 && " ✓"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
              style={{ width: `${approvalPct}%` }}
            />
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Sheet controls
            </div>
            <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {templates.find((template) => template.id === selectedTemplateId)?.name || "Default"} template active
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Autosave indicator */}
            <span className={`text-xs font-medium transition-opacity ${saveState === "idle" ? "opacity-0" : "opacity-100"} ${saveState === "saved" ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved ✓"}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={historyPast.length === 0}
              onClick={handleUndo}
              title={`Undo (${undoShortcut})`}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
              <span className="ml-2 rounded bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)]">
                {undoShortcut}
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={historyFuture.length === 0}
              onClick={handleRedo}
              title={`Redo (${redoShortcut})`}
            >
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
              <span className="ml-2 rounded bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)]">
                {redoShortcut}
              </span>
            </Button>
            {matchedUnapprovedCount > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBulkApproveMatched}
                title="Approve all rows with a confirmed match"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Approve matched ({matchedUnapprovedCount})
              </Button>
            )}
          </div>
        </Card>

        <ReviewTable
          rows={filteredRows}
          columns={columns}
          selectedRowId={selectedRowId}
          columnFilters={columnFilters}
          activeFilterColumnKey={activeFilterColumnKey}
          onSelectRow={setSelectedRowId}
          onEditField={handleEditField}
          onMoveColumn={(fromIndex, toIndex) => {
            rememberCurrentState();
            setColumns((current) => moveColumn(current, fromIndex, toIndex));
          }}
          onFilterChange={(columnKey, value) =>
            setColumnFilters((current) => ({ ...current, [columnKey]: value }))
          }
          onToggleFilterMenu={setActiveFilterColumnKey}
          pending={pending}
        />
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
                    When the selected row looks right, move the run to export.
                  </p>
                </div>
                <Link href={`/runs/${run.id}/export`}>
                  <Button>Export run</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
