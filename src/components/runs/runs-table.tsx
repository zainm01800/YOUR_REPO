"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunStatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { DashboardSnapshot, RunStatus } from "@/lib/domain/types";

type RunListItem = DashboardSnapshot["runs"][number];
type SortField = "name" | "createdAt" | "transactions" | "matchRatePct";
type SortDir = "asc" | "desc";
type RunTab = "overview" | "runs";

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
    pct >= 80 ? "text-emerald-700" : pct >= 50 ? "text-amber-600" : "text-rose-600";
  return <span className={`font-semibold tabular-nums ${color}`}>{pct}%</span>;
}

export function RunsTable({
  runs,
  canManageOperationalData = true,
}: {
  runs: RunListItem[];
  canManageOperationalData?: boolean;
}) {
  const [tab, setTab] = useState<RunTab>("overview");
  const [localRuns, setLocalRuns] = useState(runs);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

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

  function handleDeleteClick(run: RunListItem) {
    setConfirmDeleteId(run.id);
  }

  function handleDeleteConfirm(run: RunListItem) {
    setConfirmDeleteId(null);
    startTransition(async () => {
      setPendingRunId(run.id);
      setError(null);

      try {
        const response = await fetch(`/api/runs/${run.id}`, { method: "DELETE" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || "Could not delete that run.");
        }

        setLocalRuns((previous) => previous.filter((candidate) => candidate.id !== run.id));
        toast({ variant: "success", title: `"${run.name}" deleted` });
      } catch (deleteError) {
        const message =
          deleteError instanceof Error ? deleteError.message : "Could not delete that run.";
        setError(message);
        toast({ variant: "error", title: "Delete failed", description: message });
      } finally {
        setPendingRunId(null);
      }
    });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
    );
  }

  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      localRuns.filter((run) => {
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
      }),
    [dateFrom, dateTo, entityFilter, localRuns, query, statusFilter],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((left, right) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = left.name.localeCompare(right.name);
          break;
        case "createdAt":
          comparison = left.createdAt.localeCompare(right.createdAt);
          break;
        case "transactions":
          comparison = left.summary.transactions - right.summary.transactions;
          break;
        case "matchRatePct":
          comparison = (left.summary.matchRatePct ?? 0) - (right.summary.matchRatePct ?? 0);
          break;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filtered, sortDir, sortField]);

  const reviewRuns = localRuns.filter((run) => run.status === "review_required").length;
  const completedRuns = localRuns.filter(
    (run) => run.status === "completed" || run.status === "exported",
  ).length;
  const totalExceptions = localRuns.reduce((sum, run) => sum + run.summary.exceptions, 0);
  const averageMatchRate =
    localRuns.length > 0
      ? Math.round(
          localRuns.reduce((sum, run) => sum + (run.summary.matchRatePct ?? 0), 0) /
            localRuns.length,
        )
      : 0;

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as RunTab)} className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="w-full overflow-x-auto whitespace-nowrap lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">
            Run list
            <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              {sorted.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="text-sm text-[var(--muted)]">
          Keep runs small and reviewable so exceptions and export steps stay manageable.
        </div>
      </div>

      <TabsContent value="overview" className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Runs",
              value: localRuns.length.toString(),
              note: "Reconciliation workspaces currently in this business.",
            },
            {
              label: "Needs review",
              value: reviewRuns.toString(),
              note: "Runs waiting for transaction and document review.",
            },
            {
              label: "Completed / exported",
              value: completedRuns.toString(),
              note: "Runs that are already through the main workflow.",
            },
            {
              label: "Average match rate",
              value: `${averageMatchRate}%`,
              note: "A simple signal for how cleanly documents and transactions are pairing up.",
            },
          ].map((item) => (
            <Card key={item.label} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                {item.label}
              </p>
              <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {item.value}
              </p>
              <p className="text-sm text-[var(--muted)]">{item.note}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                Reconciliation workflow
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                Keep the run process easy to follow
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Each run should move clearly from import, to processing, to review, to export.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Create or continue",
                  detail: "Start a run when a new batch of documents or statement lines needs to be worked.",
                },
                {
                  title: "Review exceptions",
                  detail: "Clear mismatches and missing data before users rely on the totals.",
                },
                {
                  title: "Export with confidence",
                  detail: "Move into export only once the review queue is under control.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-[var(--color-panel)] px-4 py-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 bg-[linear-gradient(135deg,#faf8f2_0%,#f3ecde_100%)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-2 text-[var(--accent-ink)] shadow-[var(--shadow-sm)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--ink)]">What to watch</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Make the hardest work visible so teams do not miss stuck runs.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                {reviewRuns} run{reviewRuns === 1 ? "" : "s"} currently need review.
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                {totalExceptions} total exception{totalExceptions === 1 ? "" : "s"} across all runs.
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[var(--ink-2)]">
                Average match rate sits at {averageMatchRate}%.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canManageOperationalData ? (
                <Link
                  href="/runs/new"
                  className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
                >
                  Start new run
                </Link>
              ) : null}
              <Link
                href="/bookkeeping/transactions"
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                Open transactions
              </Link>
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="runs" className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search by name or entity..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--muted)]" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "" | RunStatus)}
                  className="rounded-xl border border-[var(--line)] bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">All statuses</option>
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
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
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                aria-label="Filter runs from date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                aria-label="Filter runs to date"
              />
            </div>
          </div>

          {statusFilter || entityFilter || dateFrom || dateTo || search ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-sm text-[var(--muted)]">
                Showing {sorted.length} filtered run{sorted.length === 1 ? "" : "s"}.
              </p>
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
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <Card className="px-6 py-10 text-center text-sm text-[var(--muted)]">
            No runs match your filters.
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {sorted.map((run) => (
                <Card
                  key={run.id}
                  className={`space-y-4 ${
                    confirmDeleteId === run.id ? "border-rose-300 bg-rose-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold text-[var(--ink)]">
                          {run.name}
                        </p>
                        {run.locked ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Locked
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {run.entity ?? "No entity"} · {run.period ?? "No period"}
                      </p>
                    </div>
                    <RunStatusPill status={run.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Transactions
                      </p>
                      <p className="mt-1 font-mono font-semibold text-[var(--ink)]">
                        {run.summary.transactions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Match rate
                      </p>
                      <p className="mt-1">
                        <MatchPctBadge pct={run.summary.matchRatePct ?? 0} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Exceptions
                      </p>
                      <p className="mt-1 font-mono font-semibold text-[var(--ink)]">
                        {run.summary.exceptions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Created
                      </p>
                      <p className="mt-1 text-[var(--ink-2)]">{formatDate(run.createdAt)}</p>
                    </div>
                  </div>

                  {confirmDeleteId === run.id ? (
                    <div className="rounded-2xl bg-rose-100 px-3 py-3 text-sm text-rose-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-3">
                          <p>Permanently delete this run?</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                              onClick={() => handleDeleteConfirm(run)}
                            >
                              Yes, delete
                            </button>
                            <button
                              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/runs/${run.id}/review`}
                      className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
                    >
                      Review
                    </Link>
                    <Link
                      href={`/runs/${run.id}/export`}
                      className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
                    >
                      Export
                    </Link>
                    {canManageOperationalData ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(run)}
                        disabled={pendingRunId === run.id}
                        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--danger)]"
                      >
                        {pendingRunId === run.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden overflow-hidden p-0 lg:block">
              <div className="table-scroll">
                <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                  <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <tr>
                      <th className="px-6 py-4">
                        <button
                          type="button"
                          className="flex items-center hover:text-[var(--ink)]"
                          onClick={() => toggleSort("name")}
                        >
                          Run name
                          {sortIcon("name")}
                        </button>
                      </th>
                      <th className="px-6 py-4">Entity</th>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">
                        <button
                          type="button"
                          className="flex items-center hover:text-[var(--ink)]"
                          onClick={() => toggleSort("transactions")}
                        >
                          Transactions
                          {sortIcon("transactions")}
                        </button>
                      </th>
                      <th className="px-6 py-4">Matched</th>
                      <th className="px-6 py-4 text-right">Exceptions</th>
                      <th className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="flex items-center justify-end hover:text-[var(--ink)]"
                          onClick={() => toggleSort("matchRatePct")}
                        >
                          Match %
                          {sortIcon("matchRatePct")}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button
                          type="button"
                          className="flex items-center hover:text-[var(--ink)]"
                          onClick={() => toggleSort("createdAt")}
                        >
                          Created
                          {sortIcon("createdAt")}
                        </button>
                      </th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {sorted.map((run) => (
                      <tr
                        key={run.id}
                        className={`transition ${
                          confirmDeleteId === run.id
                            ? "bg-rose-50"
                            : "hover:bg-[var(--color-panel)]"
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--ink)]">{run.name}</span>
                            {run.locked ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                Locked
                              </span>
                            ) : null}
                          </div>
                          {confirmDeleteId === run.id ? (
                            <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-xs text-rose-700">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Permanently delete this run?</span>
                              <button
                                className="ml-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                                onClick={() => handleDeleteConfirm(run)}
                              >
                                Yes, delete
                              </button>
                              <button
                                className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold hover:bg-rose-50"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-5 text-[var(--muted)]">{run.entity ?? "-"}</td>
                        <td className="px-6 py-5 text-[var(--muted)]">{run.period ?? "—"}</td>
                        <td className="px-6 py-5">
                          <RunStatusPill status={run.status} />
                        </td>
                        <td className="px-6 py-5 font-mono tabular-nums">
                          {run.summary.transactions}
                        </td>
                        <td className="px-6 py-5 font-mono tabular-nums">
                          {run.summary.matched}
                        </td>
                        <td className="px-6 py-5 text-right font-medium">
                          {run.summary.exceptions > 0 ? (
                            <Link
                              href={`/runs/${run.id}/exceptions`}
                              className="font-semibold text-[var(--danger)]"
                            >
                              {run.summary.exceptions}
                            </Link>
                          ) : (
                            <span className="text-[var(--muted)]">0</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <MatchPctBadge pct={run.summary.matchRatePct ?? 0} />
                        </td>
                        <td className="px-6 py-5 text-[var(--muted)]">
                          {formatDate(run.createdAt)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/runs/${run.id}/review`}
                              className="font-semibold text-[var(--accent)]"
                            >
                              Review
                            </Link>
                            <Link
                              href={`/runs/${run.id}/export`}
                              className="font-semibold text-[var(--muted)]"
                            >
                              Export
                            </Link>
                            {canManageOperationalData ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 px-3 text-[var(--danger)] hover:text-[var(--danger)]"
                                disabled={
                                  pendingRunId === run.id || confirmDeleteId === run.id
                                }
                                onClick={() => handleDeleteClick(run)}
                              >
                                {pendingRunId === run.id ? "Deleting..." : "Delete"}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
