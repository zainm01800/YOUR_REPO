"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FileSpreadsheet, Files, ListTree, Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import type {
  ReconciliationRun,
  ReviewActionType,
  ReviewGridColumnLayout,
  ReviewRow,
  ReviewTableTemplate,
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
import {
  cloneReviewColumns,
  createDefaultReviewTemplate,
  defaultReviewTemplateId,
  normaliseReviewTemplates,
  reviewTemplateStorageKey,
} from "@/lib/review-templates";
import { deepClone, slugify } from "@/lib/utils";

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
  const [templateName, setTemplateName] = useState("");
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [selectedFormulaTemplateId, setSelectedFormulaTemplateId] = useState<string>(
    formulaTemplates[0].id,
  );
  const [customFormula, setCustomFormula] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("template");
  const [historyPast, setHistoryPast] = useState<WorkspaceSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkspaceSnapshot[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

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
      const defaults = normaliseReviewTemplates();
      setTemplates(defaults);
      setTemplateName(defaults[0].name);
      return;
    }

    try {
      const parsed = JSON.parse(storedTemplates) as ReviewTableTemplate[];
      const nextTemplates = normaliseReviewTemplates(parsed);
      setTemplates(nextTemplates);
      setTemplateName(nextTemplates[0].name);
    } catch {
      const defaults = normaliseReviewTemplates();
      setTemplates(defaults);
      setTemplateName(defaults[0].name);
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
  const selectedFormulaTemplate =
    formulaTemplates.find((template) => template.id === selectedFormulaTemplateId) ||
    formulaTemplates[0];

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

    const matchingTemplate = templates.find((template) => template.id === snapshot.selectedTemplateId);
    setTemplateName(matchingTemplate?.name || "Default");
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

  function handleSelectTemplate(templateId: string) {
    const nextTemplate = templates.find((template) => template.id === templateId);
    if (!nextTemplate) {
      return;
    }

    rememberCurrentState();
    setSelectedTemplateId(nextTemplate.id);
    setTemplateName(nextTemplate.name);
    setColumns(cloneReviewColumns(nextTemplate.columns));
  }

  function handleSaveTemplate() {
    const name = templateName.trim();
    if (!name) {
      return;
    }

    const nextColumns = cloneReviewColumns(columns);
    setTemplates((current) => {
      const nextTemplates = normaliseReviewTemplates(current);
      const selectedTemplate = nextTemplates.find((template) => template.id === selectedTemplateId);
      const shouldUpdateCurrent =
        selectedTemplateId !== defaultReviewTemplateId &&
        selectedTemplate &&
        selectedTemplate.name === name;

      const updatedTemplates = shouldUpdateCurrent
        ? nextTemplates.map((template) =>
            template.id === selectedTemplateId
              ? { ...template, name, columns: nextColumns }
              : template,
          )
        : [
            ...nextTemplates,
            {
              id: `template_${slugify(name)}_${Date.now()}`,
              name,
              columns: nextColumns,
            },
          ];

      const normalisedTemplates = normaliseReviewTemplates(updatedTemplates);
      const activeTemplate =
        normalisedTemplates.find((template) =>
          shouldUpdateCurrent ? template.id === selectedTemplateId : template.name === name,
        ) || normalisedTemplates[0];

      setSelectedTemplateId(activeTemplate.id);
      setTemplateName(activeTemplate.name);
      return normalisedTemplates;
    });
  }

  function handleAddTemplateColumn() {
    const label = newColumnLabel.trim();
    const formula =
      selectedFormulaTemplate.id === "custom"
        ? customFormula.trim()
        : selectedFormulaTemplate.formula;

    if (!label || !formula) {
      return;
    }

    rememberCurrentState();
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

  const sidebarTabs: Array<{
    id: SidebarTab;
    label: string;
    icon: typeof FileSpreadsheet;
    disabled?: boolean;
  }> = [
    { id: "template", label: "Template", icon: FileSpreadsheet },
    { id: "documents", label: "Documents", icon: Files, disabled: !selectedRow },
    { id: "detail", label: "Detail", icon: ListTree, disabled: !selectedRow },
    { id: "actions", label: "Actions", icon: Undo2, disabled: !selectedRow },
  ];

  function renderSidebarPanel() {
    if (sidebarTab === "template") {
      return (
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Template</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Start from the current sheet, add your own columns, and save the layout as a reusable template.
            </p>
          </div>
          <div className="space-y-3">
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
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                Add a derived column
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  placeholder="Column label"
                  value={newColumnLabel}
                  onChange={(event) => setNewColumnLabel(event.target.value)}
                />
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
                {selectedFormulaTemplate.id === "custom" ? (
                  <Input
                    placeholder="Example: [Gross]-[VAT]"
                    value={customFormula}
                    onChange={(event) => setCustomFormula(event.target.value)}
                  />
                ) : (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    <div className="font-medium text-[var(--color-foreground)]">
                      {selectedFormulaTemplate.description}
                    </div>
                    <div className="mt-2 font-mono text-xs">
                      {selectedFormulaTemplate.formula}
                    </div>
                  </div>
                )}
                <div className="text-xs leading-6 text-[var(--color-muted-foreground)]">
                  Available references: Supplier, Original Value, Gross, Net, VAT, VAT %, VAT Code, GL Code
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={handleAddTemplateColumn}>
                    Add to current template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSelectTemplate(defaultReviewTemplateId)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to default
                  </Button>
                </div>
              </div>
            </div>
            <Button type="button" onClick={handleSaveTemplate}>
              <Save className="mr-2 h-4 w-4" />
              Save template
            </Button>
          </div>
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
          documents={run.documents}
        />
      );
    }

    if (sidebarTab === "detail") {
      return <ReviewDetailPanel row={selectedRow} run={run} />;
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

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Sheet controls
            </div>
            <div className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {templates.find((template) => template.id === selectedTemplateId)?.name || "Default"} template active
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={historyPast.length === 0}
              onClick={handleUndo}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={historyFuture.length === 0}
              onClick={handleRedo}
            >
              <Redo2 className="mr-2 h-4 w-4" />
              Redo
            </Button>
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

      <div className="sticky top-6 max-h-[calc(100vh-110px)] space-y-5 overflow-y-auto pr-1">
        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
          <Card className="space-y-2 p-3">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = sidebarTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => setSidebarTab(tab.id)}
                  className={`flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center text-xs font-semibold transition ${
                    isActive
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] hover:bg-white"
                  } ${tab.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </Card>
          <div>{renderSidebarPanel()}</div>
        </div>

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
