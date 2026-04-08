"use client";

import { useState } from "react";
import type {
  ReviewGridColumnLayout,
  ReviewRow,
} from "@/lib/domain/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MatchStatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function InlineCellInput({
  value,
  onCommit,
  onClose,
  type = "text",
  className,
}: {
  value?: string | number;
  onCommit: (nextValue: string) => void;
  onClose?: () => void;
  type?: "text" | "number" | "date";
  className?: string;
}) {
  const [draft, setDraft] = useState(value?.toString() || "");

  function commit() {
    if (draft !== (value?.toString() || "")) {
      onCommit(draft);
    }
  }

  return (
    <Input
      type={type}
      value={draft}
      className={className || "h-8 rounded-xl px-3"}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        commit();
        onClose?.();
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function EditableDisplay({
  cellId,
  activeCell,
  onActivate,
  onDeactivate,
  value,
  onCommit,
  display,
  type = "text",
  inputClassName,
  displayClassName,
}: {
  cellId: string;
  activeCell: string | null;
  onActivate: (cellId: string) => void;
  onDeactivate: () => void;
  value?: string | number;
  onCommit: (nextValue: string) => void;
  display: React.ReactNode;
  type?: "text" | "number" | "date";
  inputClassName?: string;
  displayClassName?: string;
}) {
  if (activeCell === cellId) {
    return (
      <InlineCellInput
        key={cellId}
        type={type}
        value={value ?? ""}
        onCommit={onCommit}
        onClose={onDeactivate}
        className={inputClassName}
      />
    );
  }

  return (
    <button
      type="button"
      className={displayClassName || "text-left"}
      onClick={(event) => {
        event.stopPropagation();
        onActivate(cellId);
      }}
    >
      {display}
    </button>
  );
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

function renderCell({
  row,
  column,
  activeCell,
  setActiveCell,
  onEditField,
}: {
  row: ReviewRow;
  column: ReviewGridColumnLayout;
  activeCell: string | null;
  setActiveCell: (cellId: string | null) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
}) {
  switch (column.key) {
    case "supplier":
      return (
        <div className="min-w-0">
          <EditableDisplay
            cellId={`${row.id}_supplier`}
            activeCell={activeCell}
            onActivate={setActiveCell}
            onDeactivate={() => setActiveCell(null)}
            value={row.supplier}
            onCommit={(value) => onEditField(row.id, "supplier", value)}
            inputClassName="h-8 rounded-xl px-3 font-semibold"
            displayClassName="max-w-full truncate text-left text-sm text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
            display={
              <span className="block truncate">
                <span className="font-semibold">{row.supplier}</span>
                {row.originalDescription ? (
                  <span className="text-[var(--color-muted-foreground)]">
                    {" "}
                    - {row.originalDescription}
                  </span>
                ) : null}
              </span>
            }
          />
        </div>
      );
    case "gross":
      return (
        <div>
          <EditableDisplay
            cellId={`${row.id}_gross`}
            activeCell={activeCell}
            onActivate={setActiveCell}
            onDeactivate={() => setActiveCell(null)}
            type="number"
            value={row.gross ?? ""}
            onCommit={(value) => onEditField(row.id, "gross", value)}
            inputClassName="h-8 w-28 rounded-xl px-3"
            displayClassName="text-left"
            display={formatCurrency(row.gross || 0, row.currency)}
          />
          <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {row.currency}
          </div>
        </div>
      );
    case "vat":
      return (
        <div>
          <EditableDisplay
            cellId={`${row.id}_vat`}
            activeCell={activeCell}
            onActivate={setActiveCell}
            onDeactivate={() => setActiveCell(null)}
            type="number"
            value={row.vat ?? ""}
            onCommit={(value) => onEditField(row.id, "vat", value)}
            inputClassName="h-8 w-24 rounded-xl px-3"
            displayClassName="text-left"
            display={
              row.vat !== undefined
                ? formatCurrency(row.vat, row.currency)
                : "Pending"
            }
          />
        </div>
      );
    case "vatPercent":
      return (
        <div className="text-sm text-[var(--color-foreground)]">
          {row.vatPercent !== undefined ? formatPercent(row.vatPercent) : "No rate"}
        </div>
      );
    case "match":
      return (
        <div>
          <MatchStatusPill status={row.matchStatus} />
          <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {Math.round(row.confidence * 100)}% confidence
          </div>
        </div>
      );
    case "vatCode":
      return (
        <EditableDisplay
          cellId={`${row.id}_vatCode`}
          activeCell={activeCell}
          onActivate={setActiveCell}
          onDeactivate={() => setActiveCell(null)}
          value={row.vatCode || ""}
          onCommit={(value) => onEditField(row.id, "vatCode", value)}
          inputClassName="h-8 rounded-xl px-3"
          displayClassName="text-left text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
          display={row.vatCode || "Missing"}
        />
      );
    case "glCode":
      return (
        <EditableDisplay
          cellId={`${row.id}_glCode`}
          activeCell={activeCell}
          onActivate={setActiveCell}
          onDeactivate={() => setActiveCell(null)}
          value={row.glCode || ""}
          onCommit={(value) => onEditField(row.id, "glCode", value)}
          inputClassName="h-8 rounded-xl px-3"
          displayClassName="text-left text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
          display={row.glCode || "Missing"}
        />
      );
    case "exceptions":
      return (
        <div className="flex flex-wrap gap-2">
          {row.exceptions.length === 0 ? (
            <Badge tone="success">Clear</Badge>
          ) : (
            row.exceptions.map((exception) => (
              <Badge
                key={`${row.id}_${exception.code}`}
                tone={
                  exception.severity === "high"
                    ? "danger"
                    : exception.severity === "medium"
                      ? "warning"
                      : "neutral"
                }
              >
                {exception.code.replace(/_/g, " ")}
              </Badge>
            ))
          )}
        </div>
      );
  }
}

export function ReviewTable({
  rows,
  columns,
  selectedRowId,
  onSelectRow,
  onEditField,
  pending,
}: {
  rows: ReviewRow[];
  columns: ReviewGridColumnLayout[];
  selectedRowId?: string;
  onSelectRow: (rowId: string) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
  pending?: boolean;
}) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const visibleColumns = columns.filter((column) => column.visible);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden p-0">
      <div className="h-[min(62vh,680px)] min-h-[420px] overflow-auto">
        <div className="min-w-max">
          <div className="flex border-b border-[var(--color-border)] bg-[#eef2f5]">
            <div className="w-14 shrink-0 border-r border-[var(--color-border)] bg-[#e5eaee]" />
            {visibleColumns.map((column, index) => (
              <div
                key={`${column.key}_letter`}
                className="flex h-10 items-center justify-center border-r border-[var(--color-border)] text-xs font-semibold text-[#61707b]"
                style={{ width: `${(column.width || 16) * 11}px` }}
              >
                {getExcelColumnName(index + 1)}
              </div>
            ))}
          </div>

          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-panel)]">
            <div className="flex h-12 w-14 shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[#f3f5f7] text-xs font-semibold text-[#61707b]">
              1
            </div>
            {visibleColumns.map((column) => (
              <div
                key={column.key}
                className="flex h-12 items-center border-r border-[var(--color-border)] px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                style={{ width: `${(column.width || 16) * 11}px` }}
              >
                {column.label}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--color-muted-foreground)]">
              No rows match the current filter.
            </div>
          ) : (
            rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className={`flex border-b border-[var(--color-border)] transition ${
                  row.id === selectedRowId
                    ? "bg-[var(--color-accent-soft)]/35"
                    : "hover:bg-[var(--color-panel)]/65"
                }`}
                onClick={() => onSelectRow(row.id)}
              >
                <div className="flex min-h-20 w-14 shrink-0 items-start justify-center border-r border-[var(--color-border)] bg-[#f8fafb] pt-4 text-xs font-semibold text-[#61707b]">
                  {rowIndex + 2}
                </div>
                {visibleColumns.map((column) => (
                  <div
                    key={`${row.id}_${column.key}`}
                    className="min-h-20 border-r border-[var(--color-border)] px-4 py-4 align-top text-sm last:border-r-0"
                    style={{ width: `${(column.width || 16) * 11}px` }}
                  >
                    {renderCell({
                      row,
                      column,
                      activeCell,
                      setActiveCell,
                      onEditField,
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      {pending ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
          Saving review changes...
        </div>
      ) : null}
    </Card>
  );
}
