"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, CheckCircle2, Filter, Loader2 } from "lucide-react";
import type { ReviewRow } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SortBy = "severity" | "supplier" | "count";
type FilterBySeverity = "all" | "high" | "medium";

const severityOrder = { high: 0, medium: 1, low: 2 };

const EXCEPTION_LABELS: Record<string, string> = {
  missing_receipt: "Missing receipt",
  amount_mismatch: "Amount mismatch",
  duplicate_receipt: "Duplicate receipt",
  low_confidence_extraction: "Low OCR confidence",
  suspicious_vat_rate: "Suspicious VAT rate",
  foreign_vat_not_claimable: "Foreign VAT (not claimable)",
  missing_gl_code: "Missing GL code",
  missing_vat_code: "Missing VAT code",
  same_receipt_used_twice: "Receipt used twice",
  gross_formula_break: "Gross formula break",
  currency_mismatch: "Currency mismatch",
  duplicate_transaction: "Duplicate transaction",
};

function InlineResolver({
  runId,
  row,
  exceptionCode,
  onResolved,
}: {
  runId: string;
  row: ReviewRow;
  exceptionCode: string;
  onResolved: () => void;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(actionType: string, submitValue?: string) {
    startTransition(async () => {
      await fetch(`/api/runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, rowId: row.id, actionType, value: submitValue ?? value }),
      });
      onResolved();
    });
  }

  if (exceptionCode === "missing_gl_code") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter GL code…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-36 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-3 text-xs"
          disabled={!value.trim() || pending}
          onClick={() => submit("override_gl_code")}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save GL"}
        </Button>
      </div>
    );
  }

  if (exceptionCode === "missing_vat_code") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="VAT code (e.g. GB20)…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-36 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-3 text-xs"
          disabled={!value.trim() || pending}
          onClick={() => submit("override_vat_code")}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save VAT"}
        </Button>
      </div>
    );
  }

  if (exceptionCode === "missing_receipt") {
    return (
      <Button
        type="button"
        variant="secondary"
        className="h-8 px-3 text-xs"
        disabled={pending}
        onClick={() => submit("no_receipt_required", "true")}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark no receipt needed"}
      </Button>
    );
  }

  return null;
}

function BulkResolvePanel({
  runId,
  rows,
  onBulkResolved,
}: {
  runId: string;
  rows: ReviewRow[];
  onBulkResolved: (exceptionCode: string) => void;
}) {
  const [glCode, setGlCode] = useState("");
  const [vatCode, setVatCode] = useState("");
  const [glPending, startGlTransition] = useTransition();
  const [vatPending, startVatTransition] = useTransition();
  const [receiptPending, startReceiptTransition] = useTransition();

  const missingGlRows = rows.filter((r) => r.exceptions.some((e) => e.code === "missing_gl_code"));
  const missingVatRows = rows.filter((r) => r.exceptions.some((e) => e.code === "missing_vat_code"));
  const missingReceiptRows = rows.filter((r) => r.exceptions.some((e) => e.code === "missing_receipt"));

  if (missingGlRows.length === 0 && missingVatRows.length === 0 && missingReceiptRows.length === 0) {
    return null;
  }

  function applyGlCode() {
    if (!glCode.trim()) return;
    startGlTransition(async () => {
      await Promise.all(
        missingGlRows.map((row) =>
          fetch(`/api/runs/${runId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId, rowId: row.id, actionType: "override_gl_code", value: glCode }),
          }),
        ),
      );
      onBulkResolved("missing_gl_code");
      setGlCode("");
    });
  }

  function applyVatCode() {
    if (!vatCode.trim()) return;
    startVatTransition(async () => {
      await Promise.all(
        missingVatRows.map((row) =>
          fetch(`/api/runs/${runId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId, rowId: row.id, actionType: "override_vat_code", value: vatCode }),
          }),
        ),
      );
      onBulkResolved("missing_vat_code");
      setVatCode("");
    });
  }

  function markAllNoReceipt() {
    startReceiptTransition(async () => {
      await Promise.all(
        missingReceiptRows.map((row) =>
          fetch(`/api/runs/${runId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId, rowId: row.id, actionType: "no_receipt_required", value: "true" }),
          }),
        ),
      );
      onBulkResolved("missing_receipt");
    });
  }

  return (
    <Card className="space-y-4 border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">Bulk resolve</p>
        <h3 className="mt-1 text-base font-semibold text-[var(--color-foreground)]">Apply fixes to multiple rows at once</h3>
      </div>

      {missingGlRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {missingGlRows.length} rows with missing GL code
          </span>
          <input
            type="text"
            placeholder="Enter GL code…"
            value={glCode}
            onChange={(e) => setGlCode(e.target.value)}
            className="h-8 w-36 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={!glCode.trim() || glPending}
            onClick={applyGlCode}
          >
            {glPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply to all"}
          </Button>
        </div>
      )}

      {missingVatRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {missingVatRows.length} rows with missing VAT code
          </span>
          <input
            type="text"
            placeholder="VAT code (e.g. GB20)…"
            value={vatCode}
            onChange={(e) => setVatCode(e.target.value)}
            className="h-8 w-36 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={!vatCode.trim() || vatPending}
            onClick={applyVatCode}
          >
            {vatPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply VAT code to all"}
          </Button>
        </div>
      )}

      {missingReceiptRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-danger)]">
            {missingReceiptRows.length} rows with missing receipt
          </span>
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={receiptPending}
            onClick={markAllNoReceipt}
          >
            {receiptPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark all no-receipt-needed"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function ExceptionsList({
  runId,
  rows: initialRows,
}: {
  runId: string;
  rows: ReviewRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [sortBy, setSortBy] = useState<SortBy>("severity");
  const [filterSeverity, setFilterSeverity] = useState<FilterBySeverity>("all");
  const [search, setSearch] = useState("");

  const allExceptionTypes = useMemo(() => {
    const types = new Set<string>();
    for (const row of rows) for (const exc of row.exceptions) types.add(exc.code);
    return Array.from(types);
  }, [rows]);

  const [filterType, setFilterType] = useState<string>("all");

  function handleResolved(rowId: string, exceptionCode: string) {
    // Optimistically remove resolved exception from UI
    setRows((current) =>
      current
        .map((r) =>
          r.id === rowId
            ? { ...r, exceptions: r.exceptions.filter((e) => e.code !== exceptionCode) }
            : r,
        )
        .filter((r) => r.exceptions.length > 0),
    );
  }

  const filtered = useMemo(() => {
    let result = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.supplier?.toLowerCase().includes(q) || r.originalDescription?.toLowerCase().includes(q),
      );
    }
    if (filterSeverity !== "all") {
      result = result.filter((r) => r.exceptions.some((e) => e.severity === filterSeverity));
    }
    if (filterType !== "all") {
      result = result.filter((r) => r.exceptions.some((e) => e.code === filterType));
    }
    result.sort((a, b) => {
      if (sortBy === "severity") {
        const aMin = Math.min(...a.exceptions.map((e) => severityOrder[e.severity as keyof typeof severityOrder] ?? 99));
        const bMin = Math.min(...b.exceptions.map((e) => severityOrder[e.severity as keyof typeof severityOrder] ?? 99));
        return aMin - bMin;
      }
      if (sortBy === "supplier") return (a.supplier || "").localeCompare(b.supplier || "");
      if (sortBy === "count") return b.exceptions.length - a.exceptions.length;
      return 0;
    });
    return result;
  }, [rows, search, filterSeverity, filterType, sortBy]);

  const highCount = rows.filter((r) => r.exceptions.some((e) => e.severity === "high")).length;
  const mediumCount = rows.filter((r) => r.exceptions.some((e) => e.severity === "medium")).length;

  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold">No exceptions — all clear</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">All rows are clean. Ready to export.</p>
        </div>
        <Link href={`/runs/${runId}/export`}><Button>Export run</Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <BulkResolvePanel
        runId={runId}
        rows={rows}
        onBulkResolved={(exceptionCode) => {
          setRows((current) =>
            current
              .map((row) => ({
                ...row,
                exceptions: row.exceptions.filter((exception) => exception.code !== exceptionCode),
              }))
              .filter((row) => row.exceptions.length > 0),
          );
        }}
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="flex items-center gap-2 rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-2 font-medium text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4" /> {highCount} high severity
        </span>
        <span className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 font-medium text-amber-700">
          {mediumCount} medium severity
        </span>
        <span className="ml-auto flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 font-medium text-[var(--color-muted-foreground)]">
          {rows.length} total
        </span>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <input
          type="text"
          placeholder="Search supplier or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as FilterBySeverity)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm focus:outline-none"
        >
          <option value="all">All severities</option>
          <option value="high">High only</option>
          <option value="medium">Medium only</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm focus:outline-none"
        >
          <option value="all">All types</option>
          {allExceptionTypes.map((t) => (
            <option key={t} value={t}>{EXCEPTION_LABELS[t] ?? t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm focus:outline-none"
          >
            <option value="severity">Sort: Severity</option>
            <option value="supplier">Sort: Supplier</option>
            <option value="count">Sort: Exception count</option>
          </select>
        </div>
        {(search || filterSeverity !== "all" || filterType !== "all") && (
          <Button variant="ghost" className="text-xs" onClick={() => { setSearch(""); setFilterSeverity("all"); setFilterType("all"); }}>
            Clear filters
          </Button>
        )}
      </Card>

      {filtered.length !== rows.length && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Showing {filtered.length} of {rows.length} exceptions
        </p>
      )}

      {filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
          No exceptions match the current filters.
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((row) => (
            <Card key={row.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{row.supplier}</h2>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-muted-foreground)]">{row.originalDescription}</p>
                  {row.date && (
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(row.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {row.reference && ` · Ref: ${row.reference}`}
                    </p>
                  )}
                </div>
                <Link href={`/runs/${runId}/review?row=${row.id}`} className="shrink-0">
                  <Button variant="secondary">Open in review</Button>
                </Link>
              </div>

              <div className="space-y-3">
                {row.exceptions.map((exc) => (
                  <div
                    key={`${row.id}_${exc.code}`}
                    className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${
                      exc.severity === "high"
                        ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <Badge tone={exc.severity === "high" ? "danger" : "warning"}>
                      {EXCEPTION_LABELS[exc.code] ?? exc.code.replace(/_/g, " ")}
                    </Badge>
                    <span className="flex-1 text-sm text-[var(--color-muted-foreground)]">{exc.message}</span>
                    <InlineResolver
                      runId={runId}
                      row={row}
                      exceptionCode={exc.code}
                      onResolved={() => handleResolved(row.id, exc.code)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
