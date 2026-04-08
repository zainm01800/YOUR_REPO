"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import {
  DataGrid,
  type CellMouseArgs,
  type CellMouseEvent,
  type Column,
  type RenderEditCellProps,
} from "react-data-grid";
import type { ReviewGridColumnLayout, ReviewRow } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getReviewCellDisplayValue } from "@/lib/review-sheet";
import { formatCurrency } from "@/lib/utils";

type EmptyGridRow = Omit<ReviewRow, "matchStatus"> & {
  __isEmpty: true;
  matchStatus: "unmatched";
};

type GridRow = ReviewRow | EmptyGridRow;

function isEmptyGridRow(row: GridRow): row is EmptyGridRow {
  return "__isEmpty" in row;
}

function HeaderFilter({
  column,
  label,
  filterValue,
  isOpen,
  onToggle,
  onChange,
}: {
  column: ReviewGridColumnLayout;
  label: string;
  filterValue?: string;
  isOpen: boolean;
  onToggle: (columnKey: string | null) => void;
  onChange: (columnKey: string, value: string) => void;
}) {
  return (
    <div className="relative flex h-full items-center gap-2 overflow-visible">
      <span className="truncate">{label}</span>
      <button
        type="button"
        className={`ml-auto rounded-md p-1 transition ${
          filterValue
            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            : "text-[#90a0aa] hover:bg-white"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(isOpen ? null : column.key);
        }}
      >
        <Filter className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%-2px)] z-50 w-[220px] rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,31,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Filter {label}
            </div>
            {filterValue ? (
              <button
                type="button"
                className="rounded-lg p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
                onClick={() => onChange(column.key, "")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Input
            className="mt-2 h-9 rounded-xl px-3"
            placeholder="Filter value"
            value={filterValue || ""}
            onChange={(event) => onChange(column.key, event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function SimpleTextEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<GridRow>) {
  const value = row[column.key as keyof GridRow];

  return (
    <Input
      autoFocus
      className="h-full rounded-none border-0 bg-white px-3 shadow-none ring-0 focus:ring-0"
      value={value?.toString() || ""}
      onChange={(event) =>
        onRowChange({ ...row, [column.key]: event.target.value }, true)
      }
      onBlur={() => onClose(true, false)}
    />
  );
}

function NumberEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<GridRow>) {
  const value = row[column.key as keyof GridRow];

  return (
    <Input
      autoFocus
      type="number"
      className="h-full rounded-none border-0 bg-white px-3 shadow-none ring-0 focus:ring-0"
      value={value?.toString() || ""}
      onChange={(event) =>
        onRowChange(
          {
            ...row,
            [column.key]: event.target.value === "" ? undefined : Number(event.target.value),
          },
          true,
        )
      }
      onBlur={() => onClose(true, false)}
    />
  );
}

function getColumnCellContent(
  row: GridRow,
  column: ReviewGridColumnLayout,
  columns: ReviewGridColumnLayout[],
  rowNumber: number,
): ReactNode {
  if (isEmptyGridRow(row)) {
    return null;
  }

  const displayValue = getReviewCellDisplayValue(row, column, columns, rowNumber);

  switch (column.key) {
    case "supplier":
      return (
        <div className="flex h-full items-center min-w-0">
          <span className="truncate">{displayValue}</span>
        </div>
      );
    case "originalValue":
      return (
        <div className="space-y-1 py-1">
          <div>{formatCurrency(row.originalAmount, row.originalCurrency)}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            {row.originalCurrency}
          </div>
        </div>
      );
    case "gross":
    case "net":
    case "vat":
      return (
        <div className="space-y-1 py-1">
          <div>{displayValue}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">{row.currency}</div>
        </div>
      );
    default:
      return <div className="flex h-full items-center">{String(displayValue)}</div>;
  }
}

function toGridColumnWidth(column: ReviewGridColumnLayout) {
  return Math.max(110, (column.width || 12) * 12);
}

function createEmptyGridRow(index: number): EmptyGridRow {
  return {
    id: `empty_${index}`,
    transactionId: "",
    source: "",
    supplier: "",
    date: undefined,
    currency: "",
    originalAmount: 0,
    originalCurrency: "",
    net: undefined,
    vat: undefined,
    gross: undefined,
    vatPercent: undefined,
    vatCode: undefined,
    glCode: undefined,
    matchStatus: "unmatched",
    confidence: 0,
    originalDescription: "",
    employee: undefined,
    notes: undefined,
    approved: false,
    excludedFromExport: false,
    exceptions: [],
    __isEmpty: true,
  };
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [targetVisibleRows, setTargetVisibleRows] = useState(18);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateVisibleRows = () => {
      const nextHeight = container.clientHeight;
      const usableHeight = Math.max(nextHeight - 46, 0);
      const requiredRows = Math.ceil(usableHeight / 54) + 2;
      setTargetVisibleRows(Math.max(requiredRows, rows.length + 1, 18));
    };

    updateVisibleRows();

    const observer = new ResizeObserver(updateVisibleRows);
    observer.observe(container);

    return () => observer.disconnect();
  }, [rows.length]);

  const displayRows = useMemo(
    () =>
      rows.length >= targetVisibleRows
        ? rows
        : [
            ...rows,
            ...Array.from(
              { length: targetVisibleRows - rows.length },
              (_, index) => createEmptyGridRow(index),
            ),
          ],
    [rows, targetVisibleRows],
  );

  const gridColumns = useMemo(() => {
    const spreadsheetColumns: Column<GridRow>[] = [
      {
        key: "__rowNumber",
        name: "",
        width: 52,
        minWidth: 52,
        maxWidth: 52,
        frozen: true,
        resizable: false,
        draggable: false,
        editable: false,
        headerCellClass: "rdg-review-header-number",
        cellClass: "rdg-review-row-number",
        renderCell: ({ rowIdx }) => <span>{rowIdx + 2}</span>,
      },
    ];

    for (const column of visibleColumns) {
      const editable =
        column.kind !== "custom" &&
        [
          "supplier",
          "originalValue",
          "gross",
          "net",
          "vat",
          "vatPercent",
          "vatCode",
          "glCode",
        ].includes(column.key);

      spreadsheetColumns.push({
        key: column.key,
        name: column.label,
        width: toGridColumnWidth(column),
        minWidth: 110,
        resizable: true,
        draggable: true,
        editable,
        editorOptions: {
          commitOnOutsideClick: true,
          closeOnExternalRowChange: true,
        },
        renderEditCell:
          ["originalValue", "gross", "net", "vat", "vatPercent"].includes(column.key)
            ? NumberEditor
            : editable
              ? SimpleTextEditor
              : undefined,
        renderHeaderCell: () => (
          <HeaderFilter
            column={column}
            label={column.label}
            filterValue={columnFilters[column.key]}
            isOpen={activeFilterColumnKey === column.key}
            onToggle={onToggleFilterMenu}
            onChange={onFilterChange}
          />
        ),
        renderCell: ({ row, rowIdx }) =>
          getColumnCellContent(row, column, visibleColumns, rowIdx + 2),
      });
    }

    return spreadsheetColumns;
  }, [
    activeFilterColumnKey,
    columnFilters,
    onFilterChange,
    onToggleFilterMenu,
    visibleColumns,
  ]);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden p-0">
      <div ref={containerRef} className="h-[min(68vh,760px)] min-h-[500px] overflow-hidden">
        <DataGrid
          aria-label="Review spreadsheet"
          className="rdg-light rdg-review-grid h-full"
          columns={gridColumns}
          rows={displayRows}
          rowHeight={54}
          headerRowHeight={46}
          rowKeyGetter={(row) => row.id}
          defaultColumnOptions={{
            resizable: true,
            draggable: true,
          }}
          onRowsChange={(nextRows, data) => {
            const rowIndex = data.indexes[0];
            if (rowIndex === undefined) {
              return;
            }

            const updatedRow = nextRows[rowIndex];
            const key = String(data.column.key);

            if (!updatedRow || key === "__rowNumber" || isEmptyGridRow(updatedRow)) {
              return;
            }

            const reviewRow = updatedRow as ReviewRow;
            const rawValue = reviewRow[key as keyof ReviewRow];
            onEditField(reviewRow.id, key, rawValue?.toString() || "");
          }}
          onColumnsReorder={(sourceKey, targetKey) => {
            const sourceIndex = visibleColumns.findIndex(
              (column) => column.key === sourceKey,
            );
            const targetIndex = visibleColumns.findIndex(
              (column) => column.key === targetKey,
            );

            if (sourceIndex >= 0 && targetIndex >= 0) {
              onMoveColumn(sourceIndex, targetIndex);
            }
          }}
          rowClass={(row) =>
            isEmptyGridRow(row)
              ? "rdg-review-row-empty"
              : row.id === selectedRowId
                ? "rdg-review-row-selected"
                : undefined
          }
          onCellClick={(args: CellMouseArgs<GridRow>, event: CellMouseEvent) => {
            if (isEmptyGridRow(args.row)) {
              event.preventGridDefault();
              return;
            }

            if (args.column.key === "__rowNumber") {
              event.preventGridDefault();
              onSelectRow(args.row.id);
              return;
            }

            onSelectRow(args.row.id);

            if (
              [
                "supplier",
                "originalValue",
                "gross",
                "net",
                "vat",
                "vatPercent",
                "vatCode",
                "glCode",
              ].includes(
                String(args.column.key),
              )
            ) {
              args.selectCell(true);
            }
          }}
        />
      </div>
      {pending ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
          Saving review changes...
        </div>
      ) : null}
    </Card>
  );
}
