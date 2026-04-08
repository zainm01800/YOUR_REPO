"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type {
  ReconciliationRun,
  ReviewActionType,
  ReviewGridColumnLayout,
  ReviewRow,
} from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewActions } from "@/components/review/review-actions";
import { ReviewDetailPanel } from "@/components/review/review-detail-panel";
import { ReviewTable } from "@/components/review/review-table";
import { buildRunSummary } from "@/lib/reconciliation/summary";

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Unmatched", value: "unmatched" },
  { label: "Mismatched", value: "mismatched" },
  { label: "Duplicates", value: "duplicates" },
  { label: "Low confidence", value: "low-confidence" },
  { label: "Missing VAT", value: "missing-vat" },
  { label: "Missing GL", value: "missing-gl" },
] as const;

const defaultColumns: ReviewGridColumnLayout[] = [
  { key: "supplier", label: "Supplier", visible: true, width: 24 },
  { key: "gross", label: "Gross", visible: true, width: 12 },
  { key: "vat", label: "VAT", visible: true, width: 12 },
  { key: "vatPercent", label: "VAT %", visible: true, width: 10 },
  { key: "match", label: "Match", visible: true, width: 16 },
  { key: "vatCode", label: "VAT Code", visible: true, width: 12 },
  { key: "glCode", label: "GL Code", visible: true, width: 12 },
  { key: "exceptions", label: "Exceptions", visible: true, width: 22 },
];

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

function applyFilter(rows: ReviewRow[], filter: string) {
  return rows.filter((candidate) => {
    switch (filter) {
      case "unmatched":
        return candidate.matchStatus === "unmatched";
      case "duplicates":
        return candidate.matchStatus === "duplicate_suspected";
      case "missing-gl":
        return candidate.exceptions.some((exception) => exception.code === "missing_gl_code");
      case "missing-vat":
        return candidate.exceptions.some((exception) => exception.code === "missing_vat_code");
      case "low-confidence":
        return candidate.exceptions.some(
          (exception) => exception.code === "low_confidence_extraction",
        );
      case "mismatched":
        return candidate.exceptions.some((exception) => exception.code === "amount_mismatch");
      default:
        return true;
    }
  });
}

function patchRowValue(row: ReviewRow, field: string, value: string): ReviewRow {
  switch (field) {
    case "supplier":
      return { ...row, supplier: value };
    case "date":
      return { ...row, date: value };
    case "gross":
      return { ...row, gross: value.trim() ? Number(value) : undefined };
    case "vat": {
      const vat = value.trim() ? Number(value) : undefined;
      const nextNet =
        row.gross !== undefined && vat !== undefined
          ? Number((row.gross - vat).toFixed(2))
          : row.net;
      return { ...row, vat, net: nextNet };
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

export function ReviewWorkspace({
  run,
  initialRows,
  initialFilter,
  initialRowId,
}: {
  run: ReconciliationRun;
  initialRows: ReviewRow[];
  initialFilter?: string;
  initialRowId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [activeFilter, setActiveFilter] = useState(initialFilter || "all");
  const [selectedRowId, setSelectedRowId] = useState(initialRowId || initialRows[0]?.id || "");
  const [columns, setColumns] = useState(defaultColumns);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setActiveFilter(initialFilter || "all");
  }, [initialFilter]);

  useEffect(() => {
    if (initialRowId) {
      setSelectedRowId(initialRowId);
    }
  }, [initialRowId]);

  const filteredRows = useMemo(
    () => applyFilter(rows, activeFilter),
    [activeFilter, rows],
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
    router.refresh();
  }

  function handleEditField(rowId: string, field: string, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? patchRowValue(row, field, value) : row,
      ),
    );

    startTransition(async () => {
      await submitMutation(rowId, "edit_field", value, field);
    });
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

  return (
    <div className="grid items-start gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <div className="grid gap-5 md:grid-cols-4">
          <Card>
            <div className="text-sm text-[var(--color-muted-foreground)]">Matched</div>
            <div className="mt-2 text-3xl font-semibold">{summary.matched}</div>
          </Card>
          <Card>
            <div className="text-sm text-[var(--color-muted-foreground)]">Needs review</div>
            <div className="mt-2 text-3xl font-semibold">{summary.exceptions}</div>
          </Card>
          <Card>
            <div className="text-sm text-[var(--color-muted-foreground)]">Duplicates</div>
            <div className="mt-2 text-3xl font-semibold">{summary.duplicates}</div>
          </Card>
          <Card>
            <div className="text-sm text-[var(--color-muted-foreground)]">Unmatched</div>
            <div className="mt-2 text-3xl font-semibold">{summary.unmatched}</div>
          </Card>
        </div>

        <ReviewTable
          rows={filteredRows}
          columns={columns}
          selectedRowId={selectedRowId}
          onSelectRow={setSelectedRowId}
          onEditField={handleEditField}
          pending={pending}
        />
      </div>

      <div className="sticky top-6 max-h-[calc(100vh-110px)] space-y-5 overflow-y-auto pr-1">
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Sheet controls</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Treat the review table like a working sheet. Set the active filter, hide columns, or move them around without leaving the screen.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Active filter
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveFilter(item.value)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    activeFilter === item.value
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Visible columns
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3"
                onClick={() => setColumns(defaultColumns)}
              >
                Reset
              </Button>
            </div>
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.key}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={(event) =>
                          setColumns((current) =>
                            current.map((item) =>
                              item.key === column.key
                                ? { ...item, visible: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      {column.label}
                    </label>
                    <div className="ml-auto flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2"
                        disabled={index === 0}
                        onClick={() =>
                          setColumns((current) => moveColumn(current, index, index - 1))
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2"
                        disabled={index === columns.length - 1}
                        onClick={() =>
                          setColumns((current) => moveColumn(current, index, index + 1))
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {selectedRow ? (
          <>
            <ReviewDetailPanel row={selectedRow} run={run} />
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
          </>
        ) : (
          <Card>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              No rows match the current filter.
            </p>
          </Card>
        )}

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
  );
}
