"use client";

import { useState } from "react";
import { Filter, GripVertical, X } from "lucide-react";
import type { ReviewGridColumnLayout, ReviewRow } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getReviewCellDisplayValue } from "@/lib/review-sheet";

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
      autoFocus
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
  columns,
  rowNumber,
  activeCell,
  setActiveCell,
  onEditField,
}: {
  row: ReviewRow;
  column: ReviewGridColumnLayout;
  columns: ReviewGridColumnLayout[];
  rowNumber: number;
  activeCell: string | null;
  setActiveCell: (cellId: string | null) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
}) {
  if (column.kind === "custom") {
    return (
      <div>
        <div className="text-[var(--color-foreground)]">
          {getReviewCellDisplayValue(row, column, columns, rowNumber)}
        </div>
        {column.formula ? (
          <div className="mt-1 truncate font-mono text-[11px] text-[var(--color-muted-foreground)]">
            {column.formula}
          </div>
        ) : null}
      </div>
    );
  }

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
    case "originalValue":
      return (
        <div>
          <div className="text-[var(--color-foreground)]">
            {formatCurrency(row.originalAmount, row.originalCurrency)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {row.originalCurrency}
          </div>
        </div>
      );
    case "gross":
    case "net":
    case "vat":
      return (
        <div>
          <EditableDisplay
            cellId={`${row.id}_${column.key}`}
            activeCell={activeCell}
            onActivate={setActiveCell}
            onDeactivate={() => setActiveCell(null)}
            type="number"
            value={row[column.key] ?? ""}
            onCommit={(value) => onEditField(row.id, column.key, value)}
            inputClassName="h-8 w-24 rounded-xl px-3"
            displayClassName="text-left"
            display={getReviewCellDisplayValue(row, column, columns, rowNumber)}
          />
          <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {row.currency}
          </div>
        </div>
      );
    case "vatPercent":
      return (
        <div className="text-[var(--color-foreground)]">
          {getReviewCellDisplayValue(row, column, columns, rowNumber)}
        </div>
      );
    case "vatCode":
    case "glCode":
      return (
        <EditableDisplay
          cellId={`${row.id}_${column.key}`}
          activeCell={activeCell}
          onActivate={setActiveCell}
          onDeactivate={() => setActiveCell(null)}
          value={row[column.key] || ""}
          onCommit={(value) => onEditField(row.id, column.key, value)}
          inputClassName="h-8 rounded-xl px-3"
          displayClassName="text-left text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
          display={getReviewCellDisplayValue(row, column, columns, rowNumber)}
        />
      );
  }
}

export function ReviewTable({
  rows,
  columns,
  selectedRowId,
  columnFilters,
  activeFilterColumnKey,
  onSelectRow,
  onEditField,
  onMoveColumn,
  onFilterChange,
  onToggleFilterMenu,
  pending,
}: {
  rows: ReviewRow[];
  columns: ReviewGridColumnLayout[];
  selectedRowId?: string;
  columnFilters: Record<string, string>;
  activeFilterColumnKey?: string | null;
  onSelectRow: (rowId: string) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
  onMoveColumn: (fromIndex: number, toIndex: number) => void;
  onFilterChange: (columnKey: string, value: string) => void;
  onToggleFilterMenu: (columnKey: string | null) => void;
  pending?: boolean;
}) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
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
            {visibleColumns.map((column, index) => (
              <div
                key={column.key}
                draggable
                onDragStart={() => setDraggedColumnIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedColumnIndex !== null && draggedColumnIndex !== index) {
                    onMoveColumn(draggedColumnIndex, index);
                  }
                  setDraggedColumnIndex(null);
                }}
                onDragEnd={() => setDraggedColumnIndex(null)}
                className="relative flex h-14 items-center gap-2 border-r border-[var(--color-border)] px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                style={{ width: `${(column.width || 16) * 11}px` }}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-[#90a0aa]" />
                <span className="truncate">{column.label}</span>
                <button
                  type="button"
                  className={`ml-auto rounded-lg p-1 transition ${
                    columnFilters[column.key]
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[#90a0aa] hover:bg-white"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFilterMenu(
                      activeFilterColumnKey === column.key ? null : column.key,
                    );
                  }}
                >
                  <Filter className="h-4 w-4" />
                </button>

                {activeFilterColumnKey === column.key ? (
                  <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-20 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,31,0.12)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                        Filter {column.label}
                      </div>
                      {columnFilters[column.key] ? (
                        <button
                          type="button"
                          className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
                          onClick={() => onFilterChange(column.key, "")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <Input
                      className="mt-2 h-9 rounded-xl px-3"
                      placeholder="Filter value"
                      value={columnFilters[column.key] || ""}
                      onChange={(event) => onFilterChange(column.key, event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--color-muted-foreground)]">
              No rows match the current filters.
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
                      columns: visibleColumns,
                      rowNumber: rowIndex + 2,
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
      <div className="border-t border-[var(--color-border)] bg-[#f8fafb] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
        Drag headers to reorder columns. Use the filter icon in a header to filter like a spreadsheet.
      </div>
    </Card>
  );
}
