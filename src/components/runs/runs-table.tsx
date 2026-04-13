"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunStatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils";
import type { DashboardSnapshot, RunStatus } from "@/lib/domain/types";

type RunListItem = DashboardSnapshot["runs"][number];

type SortField = "name" | "createdAt" | "transactions" | "matchRatePct";
type SortDir = "asc" | "desc";

const ALL_STATUSES: RunStatus[] = [
  "draft",
  "awaiting_mapping",
  "ready_to_process",
  "processing",
  "review_required",
  "completed",
  "exported",
  "failed",
];

function MatchPctBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? "text-emerald-700"
      : pct >= 50
        ? "text-amber-600"
        : "text-rose-600";
  return <span className={`font-semibold tabular-nums ${color}`}>{pct}%</span>;
}

export function RunsTable({ runs }: { runs: RunListItem[] }) {
  const [localRuns, setLocalRuns] = useState(runs);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | RunStatus>("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    setLocalRuns(runs);
  }, [runs]);

  const entityOptions = Array.from(
    new Set(localRuns.map((run) => run.entity).filter((entity): entity is string => Boolean(entity))),
  ).sort((left, right) => left.localeCompare(right));

  function handleDelete(run: RunListItem) {
    const confirmed = window.confirm(
      `Delete "${run.name}"?\n\nThis will remove the run and its review state from the workspace.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setPendingRunId(run.id);
      setError(null);

      try {
        const response = await fetch(`/api/runs/${run.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Could not delete that run.");
        }

        setLocalRuns((prev) => prev.filter((candidate) => candidate.id !== run.id));
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : "Could not delete that run.",
        );
      } finally {
        setPendingRunId(null);
      }
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
      : <ChevronDown className="ml-1 inline h-3.5 w-3.5" />;
  }

  const query = search.trim().toLowerCase();

  const filtered = localRuns.filter((run) => {
    if (statusFilter && run.status !== statusFilter) return false;
    if (entityFilter && run.entity !== entityFilter) return false;
    if (dateFrom && run.createdAt.slice(0, 10) < dateFrom) return false;
    if (dateTo && run.createdAt.slice(0, 10) > dateTo) return false;
    if (query) {
      const inName = run.name.toLowerCase().includes(query);
      const inEntity = (run.entity ?? "").toLowerCase().includes(query);
      if (!inName && !inEntity) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "createdAt":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      case "transactions":
        cmp = a.summary.transactions - b.summary.transactions;
        break;
      case "matchRatePct":
        cmp = (a.summary.matchRatePct ?? 0) - (b.summary.matchRatePct ?? 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div className="relative flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | RunStatus)}
            className="rounded-xl border border-[var(--color-border)] bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          <option value="">All entities</option>
          {entityOptions.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          aria-label="Filter runs from date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          aria-label="Filter runs to date"
        />
        {(statusFilter || entityFilter || dateFrom || dateTo || search) ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setEntityFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        {error ? (
          <div className="border-b border-[var(--color-border)] bg-rose-50 px-6 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-6 py-4">
                <button
                  type="button"
                  className="flex items-center hover:text-[var(--color-foreground)]"
                  onClick={() => toggleSort("name")}
                >
                  Run name
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-6 py-4">Entity</th>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">
                <button
                  type="button"
                  className="flex items-center hover:text-[var(--color-foreground)]"
                  onClick={() => toggleSort("transactions")}
                >
                  Transactions
                  <SortIcon field="transactions" />
                </button>
              </th>
              <th className="px-6 py-4">Matched</th>
              <th className="px-6 py-4">Exceptions</th>
              <th className="px-6 py-4">
                <button
                  type="button"
                  className="flex items-center hover:text-[var(--color-foreground)]"
                  onClick={() => toggleSort("matchRatePct")}
                >
                  Match %
                  <SortIcon field="matchRatePct" />
                </button>
              </th>
              <th className="px-6 py-4">
                <button
                  type="button"
                  className="flex items-center hover:text-[var(--color-foreground)]"
                  onClick={() => toggleSort("createdAt")}
                >
                  Created
                  <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  No runs match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((run) => (
                <tr key={run.id} className="transition hover:bg-[var(--color-panel)]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {run.name}
                      </span>
                      {run.locked && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {run.entity ?? "-"}
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {run.period ?? "—"}
                  </td>
                  <td className="px-6 py-5">
                    <RunStatusPill status={run.status} />
                  </td>
                  <td className="px-6 py-5 tabular-nums">{run.summary.transactions}</td>
                  <td className="px-6 py-5 tabular-nums">{run.summary.matched}</td>
                  <td className="px-6 py-5">
                    {run.summary.exceptions > 0 ? (
                      <Link
                        href={`/runs/${run.id}/exceptions`}
                        className="font-semibold text-[var(--color-danger)]"
                      >
                        {run.summary.exceptions}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">0</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <MatchPctBadge pct={run.summary.matchRatePct ?? 0} />
                  </td>
                  <td className="px-6 py-5 text-[var(--color-muted-foreground)]">
                    {formatDate(run.createdAt)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/runs/${run.id}/review`}
                        className="font-semibold text-[var(--color-accent)]"
                      >
                        Review
                      </Link>
                      <Link
                        href={`/runs/${run.id}/export`}
                        className="font-semibold text-[var(--color-muted-foreground)]"
                      >
                        Export
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3 text-rose-700 hover:text-rose-800"
                        disabled={pendingRunId === run.id}
                        onClick={() => handleDelete(run)}
                      >
                        {pendingRunId === run.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
