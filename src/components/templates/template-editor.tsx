"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save, Trash2, Plus } from "lucide-react";
import type { ReviewGridColumnLayout, ReviewRow, ReviewTableTemplate } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReviewTable } from "@/components/review/review-table";
import {
  cloneReviewColumns,
  createDefaultReviewTemplate,
  defaultReviewTemplateId,
  normaliseReviewTemplates,
  reviewTemplateStorageKey,
} from "@/lib/review-templates";
import { slugify } from "@/lib/utils";

const sampleRows: ReviewRow[] = [
  {
    id: "sample_1",
    transactionId: "TXN001",
    source: "card_export",
    supplier: "Uber – Client visit taxi",
    date: "2024-03-01",
    currency: "GBP",
    originalAmount: 42.6,
    originalCurrency: "GBP",
    gross: 42.6,
    net: 35.5,
    vat: 7.1,
    vatPercent: 20,
    vatCode: "GB20",
    glCode: "7400",
    matchStatus: "matched",
    confidence: 0.97,
    originalDescription: "Uber ride",
    employee: "Alice Johnson",
    notes: undefined,
    approved: false,
    excludedFromExport: false,
    exceptions: [],
  },
  {
    id: "sample_2",
    transactionId: "TXN002",
    source: "card_export",
    supplier: "Costa Coffee – Team coffee",
    date: "2024-03-02",
    currency: "GBP",
    originalAmount: 6.4,
    originalCurrency: "GBP",
    gross: 6.4,
    net: 5.33,
    vat: 1.07,
    vatPercent: 20,
    vatCode: "GB20",
    glCode: "7300",
    matchStatus: "matched",
    confidence: 0.91,
    originalDescription: "Costa Coffee",
    employee: "Bob Smith",
    notes: undefined,
    approved: false,
    excludedFromExport: false,
    exceptions: [],
  },
  {
    id: "sample_3",
    transactionId: "TXN003",
    source: "card_export",
    supplier: "Amazon Web Services",
    date: "2024-03-03",
    currency: "USD",
    originalAmount: 91.12,
    originalCurrency: "USD",
    gross: 90.02,
    net: 90.02,
    vat: 0,
    vatPercent: 0,
    vatCode: undefined,
    glCode: "7500",
    matchStatus: "unmatched",
    confidence: 0.72,
    originalDescription: "AWS monthly hosting",
    employee: undefined,
    notes: "VAT code missing",
    approved: false,
    excludedFromExport: false,
    exceptions: [{ code: "missing_vat_code" as const, severity: "medium" as const, message: "No VAT code assigned" }],
  },
  {
    id: "sample_4",
    transactionId: "TXN004",
    source: "card_export",
    supplier: "Harbour Hotel – Conference",
    date: "2024-03-05",
    currency: "GBP",
    originalAmount: 320,
    originalCurrency: "GBP",
    gross: 320,
    net: 266.67,
    vat: 53.33,
    vatPercent: 20,
    vatCode: "GB20",
    glCode: "7200",
    matchStatus: "matched",
    confidence: 0.95,
    originalDescription: "Conference accommodation",
    employee: "Carol White",
    notes: undefined,
    approved: false,
    excludedFromExport: false,
    exceptions: [],
  },
  {
    id: "sample_5",
    transactionId: "TXN005",
    source: "card_export",
    supplier: "Canal Bistro – Candidate lunch",
    date: "2024-03-06",
    currency: "GBP",
    originalAmount: 84.5,
    originalCurrency: "GBP",
    gross: 84.5,
    net: undefined,
    vat: undefined,
    vatPercent: undefined,
    vatCode: undefined,
    glCode: undefined,
    matchStatus: "unmatched",
    confidence: 0.55,
    originalDescription: "Lunch meeting",
    employee: "David Lee",
    notes: undefined,
    approved: false,
    excludedFromExport: false,
    exceptions: [{ code: "missing_receipt" as const, severity: "high" as const, message: "No receipt matched" }],
  },
];

const COLUMN_CHIPS = [
  "Supplier", "Original Value", "Gross", "Net", "VAT", "VAT %", "VAT Code", "GL Code",
] as const;

export function TemplateEditor() {
  const [templates, setTemplates] = useState<ReviewTableTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>(defaultReviewTemplateId);
  const [editingColumns, setEditingColumns] = useState<ReviewGridColumnLayout[]>([]);
  const [templateName, setTemplateName] = useState("Default");
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [formula, setFormula] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const formulaInputRef = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(reviewTemplateStorageKey) : null;
    let parsed: ReviewTableTemplate[] = [];
    if (stored) {
      try {
        parsed = JSON.parse(stored) as ReviewTableTemplate[];
      } catch {
        parsed = [];
      }
    }
    const normalised = normaliseReviewTemplates(parsed);
    setTemplates(normalised);
    setEditingColumns(cloneReviewColumns(normalised[0].columns));
    setTemplateName(normalised[0].name);
    setSelectedId(normalised[0].id);
  }, []);

  function saveToStorage(next: ReviewTableTemplate[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(reviewTemplateStorageKey, JSON.stringify(next));
    }
  }

  function handleSelectTemplate(id: string) {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    setSelectedId(id);
    setEditingColumns(cloneReviewColumns(t.columns));
    setTemplateName(t.name);
  }

  function handleToggleColumn(key: string) {
    setEditingColumns((cols) =>
      cols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)),
    );
  }

  function handleRemoveColumn(key: string) {
    setEditingColumns((cols) => cols.filter((c) => c.key !== key));
  }

  function insertChip(colName: string) {
    setFormula((prev) => prev + `[${colName}]`);
  }

  function handleAddColumn() {
    const label = newColumnLabel.trim();
    const f = formula.trim();
    if (!label || !f) return;

    setEditingColumns((cols) => [
      ...cols,
      { key: `custom_${Date.now()}` as any, label, visible: true, width: 14, kind: "custom", formula: f },
    ]);
    setNewColumnLabel("");
    setFormula("");
    setAiDescription("");
    setAiError(null);
  }

  async function handleAiFormula() {
    const desc = aiDescription.trim();
    if (!desc) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        if (data.formula) setFormula(data.formula);
        if (data.label && !newColumnLabel.trim()) setNewColumnLabel(data.label);
      }
    } catch {
      setAiError("Failed to reach AI service.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    const name = templateName.trim();
    if (!name) return;

    const columns = cloneReviewColumns(editingColumns);
    const isDefault = selectedId === defaultReviewTemplateId;

    let next: ReviewTableTemplate[];
    let newId = selectedId;

    if (!isDefault && templates.some((t) => t.id === selectedId)) {
      // Update existing custom template
      next = normaliseReviewTemplates(
        templates.map((t) => (t.id === selectedId ? { ...t, name, columns } : t)),
      );
    } else {
      // Create new template
      newId = `template_${slugify(name)}_${Date.now()}`;
      next = normaliseReviewTemplates([...templates, { id: newId, name, columns }]);
    }

    setTemplates(next);
    setSelectedId(newId);
    saveToStorage(next);
  }

  function handleDelete(id: string) {
    if (id === defaultReviewTemplateId) return;
    const next = normaliseReviewTemplates(templates.filter((t) => t.id !== id));
    setTemplates(next);
    saveToStorage(next);
    if (selectedId === id) {
      setSelectedId(defaultReviewTemplateId);
      setEditingColumns(cloneReviewColumns(createDefaultReviewTemplate().columns));
      setTemplateName("Default");
    }
  }

  function handleNewTemplate() {
    setSelectedId(defaultReviewTemplateId);
    setEditingColumns(cloneReviewColumns(createDefaultReviewTemplate().columns));
    setTemplateName("");
  }

  const isEditing = selectedId !== defaultReviewTemplateId && templates.some((t) => t.id === selectedId && !t.locked);

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      {/* Template list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Saved templates
          </h2>
          <Button type="button" variant="secondary" onClick={handleNewTemplate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </div>
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => handleSelectTemplate(t.id)}
              className={`group flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                selectedId === t.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-border)] bg-white hover:bg-[var(--color-panel)]"
              }`}
            >
              <div>
                <div className="font-semibold text-[var(--color-foreground)]">{t.name}</div>
                <div className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {t.columns.filter((c) => c.visible).length} visible columns
                  {t.locked ? " · Default" : ""}
                </div>
              </div>
              {!t.locked && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  className="ml-3 opacity-0 transition group-hover:opacity-100 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-5">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {isEditing ? "Edit template" : "New template"}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
                Toggle columns on or off, add derived columns with formulas, then save.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingColumns(cloneReviewColumns(createDefaultReviewTemplate().columns));
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset columns
              </Button>
              <Button type="button" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save template
              </Button>
            </div>
          </div>

          <div className="max-w-sm">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                Template name
              </span>
              <Input
                placeholder="e.g. Month-end close"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </label>
          </div>

          {/* Column toggles */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Columns
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {editingColumns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-foreground)]">
                      {col.label}
                    </div>
                    {col.kind === "custom" && col.formula && (
                      <div className="mt-0.5 truncate font-mono text-xs text-[var(--color-muted-foreground)]">
                        {col.formula}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleColumn(col.key)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        col.visible ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          col.visible ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                    {col.kind === "custom" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(col.key)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Add derived column */}
        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Add a derived column</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
              Build a formula by clicking column chips or typing it in, then give the column a name.
            </p>
          </div>

          {/* AI natural language input */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Generate with AI (Groq)
            </div>
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "variance between gross and original value"'
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAiFormula(); }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={aiLoading || !aiDescription.trim()}
                onClick={handleAiFormula}
              >
                {aiLoading ? "Generating…" : "Generate"}
              </Button>
            </div>
            {aiError && (
              <p className="text-xs text-[var(--color-danger)]">{aiError}</p>
            )}
          </div>

          {/* Formula bar + column chips */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Formula
            </div>
            <Input
              placeholder="e.g. =[Gross]-[VAT]"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              {COLUMN_CHIPS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertChip(col)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1 font-mono text-xs text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)] hover:border-[var(--color-accent)] transition"
                >
                  [{col}]
                </button>
              ))}
              {["+", "−", "×", "÷"].map((op, i) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setFormula((f) => f + ["+", "-", "*", "/"][i])}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 font-mono text-xs text-[var(--color-muted-foreground)] hover:bg-white transition"
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              Column label
            </span>
            <Input
              placeholder="e.g. Net check"
              value={newColumnLabel}
              onChange={(e) => setNewColumnLabel(e.target.value)}
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            disabled={!newColumnLabel.trim() || !formula.trim()}
            onClick={handleAddColumn}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add column to template
          </Button>
        </Card>
      </div>

      {/* Live table preview — spans full width */}
      <div className="xl:col-span-2 space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Preview
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Sample data showing how your column layout will look in the review table.
          </p>
        </div>
        <ReviewTable
          rows={sampleRows}
          columns={editingColumns}
          selectedRowId=""
          columnFilters={{}}
          activeFilterColumnKey={null}
          onSelectRow={() => {}}
          onEditField={() => {}}
          onMoveColumn={() => {}}
          onFilterChange={() => {}}
          onToggleFilterMenu={() => {}}
        />
      </div>
    </div>
  );
}
