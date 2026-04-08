"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReconciliationRun, ReviewActionType, ReviewRow } from "@/lib/domain/types";
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
    <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
      <div className="space-y-5">
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

        <Card className="flex flex-wrap gap-3">
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
        </Card>

        <ReviewTable
          rows={filteredRows}
          selectedRowId={selectedRowId}
          onSelectRow={setSelectedRowId}
          onEditField={handleEditField}
          pending={pending}
        />
      </div>

      <div className="space-y-5">
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
