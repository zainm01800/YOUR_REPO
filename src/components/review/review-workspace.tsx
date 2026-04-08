"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  ReconciliationRun,
  ReviewActionType,
  ReviewGridColumnLayout,
  ReviewRow,
} from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentAttachmentPanel } from "@/components/review/document-attachment-panel";
import { ReviewActions } from "@/components/review/review-actions";
import { ReviewDetailPanel } from "@/components/review/review-detail-panel";
import { ReviewTable } from "@/components/review/review-table";
import { buildRunSummary } from "@/lib/reconciliation/summary";
import { getReviewCellFilterText } from "@/lib/review-sheet";

const formulaTemplates = [
  {
    id: "net_from_gross_vat",
    label: "Net from gross and VAT",
    formula: "=[Gross]-[VAT]",
    description: "Creates a net value column from reviewed gross minus VAT",
  },
  {
    id: "gross_from_net_vat",
    label: "Gross from net and VAT",
    formula: "=[Net]+[VAT]",
    description: "Builds a tax-inclusive total from net plus VAT",
  },
  {
    id: "variance_to_original",
    label: "Variance to original amount",
    formula: "=[Gross]-[Original Value]",
    description: "Shows whether the reviewed gross differs from the source transaction value",
  },
  {
    id: "net_variance_to_original",
    label: "Net variance to original",
    formula: "=[Net]-[Original Value]",
    description: "Compares the reviewed net amount against the original transaction value",
  },
  {
    id: "vat_rate_from_values",
    label: "Effective VAT rate",
    formula: "=[VAT]/[Net]",
    description: "Calculates the effective VAT rate from VAT divided by net",
  },
  {
    id: "vat_share_of_gross",
    label: "VAT share of gross",
    formula: "=[VAT]/[Gross]",
    description: "Shows how much of the gross amount is tax",
  },
  {
    id: "recoverable_vat_check",
    label: "Recoverable VAT value",
    formula: "=[VAT]",
    description: "Copies the VAT amount into a dedicated recoverable tax column",
  },
  {
    id: "taxable_base",
    label: "Taxable base",
    formula: "=[Net]",
    description: "Copies the net amount into a dedicated taxable-base column",
  },
  {
    id: "gross_to_net_ratio",
    label: "Gross to net ratio",
    formula: "=[Gross]/[Net]",
    description: "Useful for checking unusual invoice structures or tax anomalies",
  },
  {
    id: "vat_to_original_ratio",
    label: "VAT against original amount",
    formula: "=[VAT]/[Original Value]",
    description: "Shows the VAT share against the original transaction amount",
  },
  {
    id: "net_to_original_ratio",
    label: "Net against original amount",
    formula: "=[Net]/[Original Value]",
    description: "Shows the net share against the source transaction value",
  },
  {
    id: "amount_check",
    label: "Amount balance check",
    formula: "=[Gross]-[Net]-[VAT]",
    description: "Checks that gross minus net minus VAT balances to zero",
  },
  {
    id: "custom",
    label: "Custom formula",
    formula: "",
    description: "Write your own formula using the available column references",
  },
] as const;

const defaultColumns: ReviewGridColumnLayout[] = [
  { key: "supplier", label: "Supplier", visible: true, width: 24 },
  { key: "originalValue", label: "Original Value", visible: true, width: 14 },
  { key: "gross", label: "Gross", visible: true, width: 12 },
  { key: "net", label: "Net", visible: true, width: 12 },
  { key: "vat", label: "VAT", visible: true, width: 12 },
  { key: "vatPercent", label: "VAT %", visible: true, width: 10 },
  { key: "vatCode", label: "VAT Code", visible: true, width: 12 },
  { key: "glCode", label: "GL Code", visible: true, width: 12 },
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

function patchRowValue(row: ReviewRow, field: string, value: string): ReviewRow {
  switch (field) {
    case "supplier":
      return { ...row, supplier: value };
    case "date":
      return { ...row, date: value };
    case "gross":
      return { ...row, gross: value.trim() ? Number(value) : undefined };
    case "net": {
      const net = value.trim() ? Number(value) : undefined;
      const nextVat =
        row.gross !== undefined && net !== undefined
          ? Number((row.gross - net).toFixed(2))
          : row.vat;
      return { ...row, net, vat: nextVat };
    }
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
  initialRowId,
}: {
  run: ReconciliationRun;
  initialRows: ReviewRow[];
  initialRowId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selectedRowId, setSelectedRowId] = useState(initialRowId || initialRows[0]?.id || "");
  const [columns, setColumns] = useState(defaultColumns);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterColumnKey, setActiveFilterColumnKey] = useState<string | null>(null);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [selectedFormulaTemplateId, setSelectedFormulaTemplateId] = useState<string>(
    formulaTemplates[0].id,
  );
  const [customFormula, setCustomFormula] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (initialRowId) {
      setSelectedRowId(initialRowId);
    }
  }, [initialRowId]);

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

  function handleAddCustomColumn() {
    const label = newColumnLabel.trim();
    const selectedTemplate = formulaTemplates.find(
      (template) => template.id === selectedFormulaTemplateId,
    );
    const formula =
      selectedTemplate?.id === "custom"
        ? customFormula.trim()
        : selectedTemplate?.formula;

    if (!label || !formula) {
      return;
    }

    setColumns((current) => [
      ...current,
      {
        key: `custom_${Date.now()}`,
        label,
        visible: true,
        width: 14,
        kind: "custom",
        formula,
      },
    ]);
    setNewColumnLabel("");
    setCustomFormula("");
  }

  const selectedFormulaTemplate =
    formulaTemplates.find((template) => template.id === selectedFormulaTemplateId) ||
    formulaTemplates[0];

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
          columnFilters={columnFilters}
          activeFilterColumnKey={activeFilterColumnKey}
          onSelectRow={setSelectedRowId}
          onEditField={handleEditField}
          onMoveColumn={(fromIndex, toIndex) =>
            setColumns((current) => moveColumn(current, fromIndex, toIndex))
          }
          onFilterChange={(columnKey, value) =>
            setColumnFilters((current) => ({ ...current, [columnKey]: value }))
          }
          onToggleFilterMenu={setActiveFilterColumnKey}
          pending={pending}
        />
      </div>

      <div className="sticky top-6 max-h-[calc(100vh-110px)] space-y-5 overflow-y-auto pr-1">
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Add column</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Add a custom sheet column using a ready-made spreadsheet formula template.
            </p>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Column label"
              value={newColumnLabel}
              onChange={(event) => setNewColumnLabel(event.target.value)}
            />
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                Formula template
              </span>
              <select
                className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)]"
                value={selectedFormulaTemplateId}
                onChange={(event) => setSelectedFormulaTemplateId(event.target.value)}
              >
                {formulaTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-6 text-[var(--color-foreground)]">
              <div className="font-medium">{selectedFormulaTemplate.description}</div>
              {selectedFormulaTemplate.id === "custom" ? (
                <Input
                  className="mt-3"
                  placeholder="Example: =[Gross]-[VAT]"
                  value={customFormula}
                  onChange={(event) => setCustomFormula(event.target.value)}
                />
              ) : (
                <div className="mt-2 font-mono text-xs text-[var(--color-muted-foreground)]">
                  {selectedFormulaTemplate.formula}
                </div>
              )}
              <div className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                Available references: Supplier, Original Value, Gross, Net, VAT, VAT %, VAT Code, GL Code
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={handleAddCustomColumn}>
                Add column
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setColumns(defaultColumns)}
              >
                Reset base columns
              </Button>
            </div>
          </div>
        </Card>

        {selectedRow ? (
          <>
            <DocumentAttachmentPanel
              key={`documents_${selectedRow.id}`}
              runId={run.id}
              row={selectedRow}
              documents={run.documents}
            />
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
