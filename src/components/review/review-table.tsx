"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Filter, X } from "lucide-react";
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

type SummaryRow = {
  id: "totals";
  values: Record<string, string>;
};

type RowGroupMeta = {
  colorGroupIndex: number;
  groupIndex: number;
  groupKey: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isMultiRowGroup: boolean;
};

function isEmptyGridRow(row: GridRow): row is EmptyGridRow {
  return "__isEmpty" in row;
}

function HeaderFilter({
  column,
  label,
  filterValue,
  isOpen,
  sortDirection,
  onToggle,
  onChange,
  onSort,
}: {
  column: ReviewGridColumnLayout;
  label: string;
  filterValue?: string;
  isOpen: boolean;
  sortDirection?: "asc" | "desc" | null;
  onToggle: (columnKey: string | null) => void;
  onChange: (columnKey: string, value: string) => void;
  onSort: (columnKey: string) => void;
}) {
  return (
    <div className="relative flex h-full items-center gap-2 overflow-visible">
      <button
        type="button"
        className="flex min-w-0 items-center gap-1 truncate text-left hover:text-[var(--color-foreground)]"
        onClick={(event) => {
          event.stopPropagation();
          onSort(column.key);
        }}
      >
        <span className="truncate">{label}</span>
        {sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : null}
        {sortDirection === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : null}
      </button>
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
}: RenderEditCellProps<GridRow, SummaryRow>) {
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
}: RenderEditCellProps<GridRow, SummaryRow>) {
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
  groupMeta?: RowGroupMeta,
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
      if (groupMeta?.isMultiRowGroup && !groupMeta.isFirstInGroup) {
        return null;
      }
      return (
        <div className="space-y-1 py-1">
          <div>{String(displayValue)}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            {row.originalCurrency || row.currency}
          </div>
        </div>
      );
    case "gross":
    case "net":
      return (
        <div className="space-y-1 py-1">
          <div>{String(displayValue)}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            {(column.key === "gross" && row.grossInRunCurrency !== undefined) ||
            (column.key === "net" && row.netInRunCurrency !== undefined)
              ? row.runCurrency
              : row.currency}
          </div>
        </div>
      );
    case "vat": {
      const isZeroVat = row.vat === 0 || (row.vat === undefined && row.gross !== undefined);
      return (
        <div className="space-y-1 py-1">
          <div>
            {isZeroVat && row.vat === 0
              ? `0.00 ${row.vatInRunCurrency !== undefined ? row.runCurrency : row.currency}`
              : String(displayValue)}
          </div>
          <div className="text-xs opacity-60">
            {row.vatInRunCurrency !== undefined ? row.runCurrency : row.currency}
          </div>
        </div>
      );
    }
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
    runCurrency: "GBP",
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

function getRowGroupKey(row: ReviewRow) {
  return row.documentId || `transaction_${row.transactionId}`;
}

function getStableColorGroupIndex(groupKey: string) {
  let hash = 0;

  for (let index = 0; index < groupKey.length; index += 1) {
    hash = (hash * 31 + groupKey.charCodeAt(index)) % 7_919;
  }

  return Math.abs(hash) % 6;
}

function formatSummaryValue(value: number, currency?: string) {
  if (!currency) {
    return value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return formatCurrency(value, currency);
}

export function ReviewTable({
  rows,
  columns,
  selectedRowId,
  selectedRowIds,
  columnFilters,
  activeFilterColumnKey,
  sortColumnKey,
  sortDirection,
  isTableEditingEnabled,
  onSelectRow,
  onToggleRowSelect,
  onEditField,
  onMoveColumn,
  onFilterChange,
  onToggleFilterMenu,
  onToggleSort,
  pending,
}: {
  rows: ReviewRow[];
  columns: ReviewGridColumnLayout[];
  selectedRowId?: string;
  selectedRowIds?: Set<string>;
  columnFilters: Record<string, string>;
  activeFilterColumnKey?: string | null;
  sortColumnKey?: string | null;
  sortDirection?: "asc" | "desc";
  isTableEditingEnabled?: boolean;
  onSelectRow: (rowId: string) => void;
  onToggleRowSelect?: (rowId: string) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
  onMoveColumn: (fromIndex: number, toIndex: number) => void;
  onFilterChange: (columnKey: string, value: string) => void;
  onToggleFilterMenu: (columnKey: string | null) => void;
  onToggleSort?: (columnKey: string) => void;
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
      const requiredRows = Math.ceil(usableHeight / 54) + 4;
      setTargetVisibleRows(Math.max(requiredRows, rows.length + 2, 20));
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

  const rowGroupMeta = useMemo(() => {
    const meta = new Map<string, RowGroupMeta>();
    let groupIndex = -1;
    let currentGroupKey: string | null = null;

    rows.forEach((row, index) => {
      const groupKey = getRowGroupKey(row);

      if (groupKey !== currentGroupKey) {
        currentGroupKey = groupKey;
        groupIndex += 1;
      }

      const previousRow = rows[index - 1];
      const nextRow = rows[index + 1];
      const isFirstInGroup =
        !previousRow || getRowGroupKey(previousRow) !== groupKey;
      const isLastInGroup =
        !nextRow || getRowGroupKey(nextRow) !== groupKey;
      const isMultiRowGroup =
        !isFirstInGroup || !isLastInGroup;

      meta.set(row.id, {
        colorGroupIndex: getStableColorGroupIndex(groupKey),
        groupIndex,
        groupKey,
        isFirstInGroup,
        isLastInGroup,
        isMultiRowGroup,
      });
    });

    return meta;
  }, [rows]);

  const bottomSummaryRows = useMemo<readonly SummaryRow[]>(() => {
    const values: Record<string, string> = {};

    const originalRows = rows.filter((row) => {
      const meta = rowGroupMeta.get(row.id);
      return !meta || meta.isFirstInGroup;
    });

    const originalCurrencies = [...new Set(originalRows.map((row) => row.currency).filter(Boolean))];
    const runCurrencies = [...new Set(rows.map((row) => row.runCurrency).filter(Boolean))];
    const runCurrency = runCurrencies.length === 1 ? runCurrencies[0] : undefined;

    const originalTotal = originalRows.reduce((sum, row) => {
      return sum + (row.originalAmount > 0 ? row.originalAmount : 0);
    }, 0);
    values.originalValue =
      originalCurrencies.length === 1
        ? formatSummaryValue(originalTotal, originalRows[0]?.originalCurrency || originalCurrencies[0])
        : "Mixed";

    const grossTotal = rows.reduce(
      (sum, row) => sum + (row.grossInRunCurrency ?? row.gross ?? 0),
      0,
    );
    values.gross = formatSummaryValue(grossTotal, runCurrency);

    const netTotal = rows.reduce(
      (sum, row) => sum + (row.netInRunCurrency ?? row.net ?? 0),
      0,
    );
    values.net = formatSummaryValue(netTotal, runCurrency);

    const vatTotal = rows.reduce(
      (sum, row) => sum + (row.vatInRunCurrency ?? row.vat ?? 0),
      0,
    );
    values.vat = formatSummaryValue(vatTotal, runCurrency);

    return [{ id: "totals", values }];
  }, [rowGroupMeta, rows]);

  const gridColumns = useMemo(() => {
    const spreadsheetColumns: Column<GridRow, SummaryRow>[] = [
      {
        key: "__select",
        name: "",
        width: 40,
        minWidth: 40,
        maxWidth: 40,
        frozen: true,
        resizable: false,
        draggable: false,
        editable: false,
        headerCellClass: "rdg-review-header-number",
        cellClass: "rdg-review-row-number",
        renderHeaderCell: () =>
          selectedRowIds && onToggleRowSelect ? (
            <div className="flex h-full items-center justify-center" />
          ) : null,
        renderCell: ({ row }) => {
          if (isEmptyGridRow(row) || !onToggleRowSelect || !selectedRowIds) return null;
          const checked = selectedRowIds.has(row.id);
          return (
            <div className="flex h-full items-center justify-center">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleRowSelect(row.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 cursor-pointer rounded accent-[var(--color-accent)]"
              />
            </div>
          );
        },
        renderSummaryCell: () => null,
      },
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
        renderSummaryCell: () => <span>Σ</span>,
      },
    ];

    for (const column of visibleColumns) {
      const editable =
        isTableEditingEnabled &&
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

      const isVatColumn = column.key === "vat";
      spreadsheetColumns.push({
        key: column.key,
        name: column.label,
        width: toGridColumnWidth(column),
        minWidth: 110,
        resizable: true,
        draggable: true,
        editable,
        cellClass: isVatColumn
          ? (row: GridRow) =>
              !isEmptyGridRow(row) && row.vat === 0 ? "rdg-vat-zero" : undefined
          : undefined,
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
            sortDirection={sortColumnKey === column.key ? sortDirection || "asc" : null}
            onToggle={onToggleFilterMenu}
            onChange={onFilterChange}
            onSort={onToggleSort || (() => {})}
          />
        ),
        renderCell: ({ row, rowIdx }) =>
          getColumnCellContent(
            row,
            column,
            visibleColumns,
            rowIdx + 2,
            isEmptyGridRow(row) ? undefined : rowGroupMeta.get(row.id),
          ),
        renderSummaryCell: ({ row }) => {
          if (column.key === "supplier") {
            return <span className="font-semibold text-[var(--color-foreground)]">Totals</span>;
          }

          return row.values[column.key] || "";
        },
      });
    }

    return spreadsheetColumns;
  }, [
    activeFilterColumnKey,
    columnFilters,
    isTableEditingEnabled,
    onFilterChange,
    onToggleFilterMenu,
    onToggleSort,
    onToggleRowSelect,
    rowGroupMeta,
    sortColumnKey,
    sortDirection,
    selectedRowIds,
    visibleColumns,
  ]);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden p-0">
      <div ref={containerRef} className="h-[min(68vh,760px)] min-h-[500px] overflow-hidden">
        <DataGrid<GridRow, SummaryRow>
          aria-label="Review spreadsheet"
          className="rdg-light rdg-review-grid h-full"
          style={{ height: "100%", width: "100%" }}
          columns={gridColumns}
          rows={displayRows}
          rowHeight={54}
          headerRowHeight={46}
          rowKeyGetter={(row) => row.id}
          defaultColumnOptions={{
            resizable: true,
            draggable: true,
          }}
          bottomSummaryRows={bottomSummaryRows}
          summaryRowHeight={42}
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
          rowClass={(row) => {
            if (isEmptyGridRow(row)) {
              return "rdg-review-row-empty";
            }

            const meta = rowGroupMeta.get(row.id);
            const classes = [
              `rdg-review-group-${meta?.colorGroupIndex || 0}`,
              meta?.isFirstInGroup ? "rdg-review-group-start" : "",
              meta?.isLastInGroup ? "rdg-review-group-end" : "",
              row.id === selectedRowId ? "rdg-review-row-selected" : "",
            ].filter(Boolean);

            return classes.join(" ");
          }}
          onCellClick={(args: CellMouseArgs<GridRow, SummaryRow>, event: CellMouseEvent) => {
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
              isTableEditingEnabled &&
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
      ) : !isTableEditingEnabled ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
          Table editing is off. Use the Edit table button above to enable inline changes.
        </div>
      ) : null}
    </Card>
  );
}
