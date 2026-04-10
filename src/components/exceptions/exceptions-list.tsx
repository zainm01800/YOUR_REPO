"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, Filter } from "lucide-react";
import type { ReviewRow } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SortBy = "severity" | "supplier" | "count";
type FilterBySeverity = "all" | "high" | "medium";

const severityOrder = { high: 0, medium: 1, low: 2 };

export function ExceptionsList({
  runId,
  rows,
}: {
  runId: string;
  rows: ReviewRow[];
}) {
  const [sortBy, setSortBy] = useState<SortBy>("severity");
  const [filterSeverity, setFilterSeverity] = useState<FilterBySeverity>("all");
  const [search, setSearch] = useState("");

  const allExceptionTypes = useMemo(() => {
    const types = new Set<string>();
    for (const row of rows) {
      for (const exc of row.exceptions) {
        types.add(exc.code);
      }
    }
    return Array.from(types);
  }, [rows]);

  const [filterType, setFilterType] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = [...rows];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.supplier?.toLowerCase().includes(q) ||
          r.originalDescription?.toLowerCase().includes(q),
      );
    }

    // Severity filter
    if (filterSeverity !== "all") {
      result = result.filter((r) =>
        r.exceptions.some((e) => e.severity === filterSeverity),
      );
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((r) =>
        r.exceptions.some((e) => e.code === filterType),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "severity") {
        const aMin = Math.min(
          ...a.exceptions.map((e) => severityOrder[e.severity as keyof typeof severityOrder] ?? 99),
        );
        const bMin = Math.min(
          ...b.exceptions.map((e) => severityOrder[e.severity as keyof typeof severityOrder] ?? 99),
        );
        return aMin - bMin;
      }
      if (sortBy === "supplier") {
        return (a.supplier || "").localeCompare(b.supplier || "");
      }
      if (sortBy === "count") {
        return b.exceptions.length - a.exceptions.length;
      }
      return 0;
    });

    return result;
  }, [rows, search, filterSeverity, filterType, sortBy]);

  const highCount = rows.filter((r) => r.exceptions.some((e) => e.severity === "high")).length;
  const mediumCount = rows.filter((r) => r.exceptions.some((e) => e.severity === "medium")).length;

  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-accent-soft)]">
          <AlertTriangle className="h-6 w-6 text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--color-foreground)]">No exceptions</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            All rows look clean. Ready to export.
          </p>
        </div>
        <Link href={`/runs/${runId}/export`}>
          <Button>Export run</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="flex items-center gap-2 rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-2 font-medium text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4" />
          {highCount} high severity
        </span>
        <span className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 font-medium text-[var(--color-muted-foreground)]">
          {mediumCount} medium severity
        </span>
        <span className="ml-auto flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 font-medium text-[var(--color-muted-foreground)]">
          {rows.length} total exceptions
        </span>
      </div>

      {/* Filter and sort bar */}
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search supplier or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
        />

        {/* Severity filter */}
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as FilterBySeverity)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-foreground)] focus:outline-none"
        >
          <option value="all">All severities</option>
          <option value="high">High only</option>
          <option value="medium">Medium only</option>
        </select>

        {/* Exception type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-foreground)] focus:outline-none"
        >
          <option value="all">All types</option>
          {allExceptionTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm text-[var(--color-foreground)] focus:outline-none"
          >
            <option value="severity">Sort: Severity</option>
            <option value="supplier">Sort: Supplier</option>
            <option value="count">Sort: Exception count</option>
          </select>
        </div>

        {(search || filterSeverity !== "all" || filterType !== "all") && (
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              setSearch("");
              setFilterSeverity("all");
              setFilterType("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </Card>

      {/* Result count */}
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
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                    {row.supplier}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {row.originalDescription}
                  </p>
                </div>
                <Link href={`/runs/${runId}/review?row=${row.id}`}>
                  <Button variant="secondary">Open row</Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {row.exceptions.map((exception) => (
                  <Badge
                    key={`${row.id}_${exception.code}`}
                    tone={exception.severity === "high" ? "danger" : "warning"}
                  >
                    {exception.message}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
