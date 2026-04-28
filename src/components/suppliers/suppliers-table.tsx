"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search, ShieldAlert, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

interface SupplierRow {
  supplier: string;
  totalSpend: number;
  totalVat: number;
  avgVatRate: number;
  rowCount: number;
  exceptions: number;
  topGlCodes: string;
}

type SupplierTab = "overview" | "directory";

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  if (!active) return <span className="ml-1 opacity-30">↕</span>;
  return <span className="ml-1">{direction === "asc" ? "↑" : "↓"}</span>;
}

export function SuppliersTable({
  suppliers,
  currency,
}: {
  suppliers: SupplierRow[];
  currency: string;
}) {
  const [tab, setTab] = useState<SupplierTab>("overview");
  const [query, setQuery] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [sortField, setSortField] = useState<keyof SupplierRow>("totalSpend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(field: keyof SupplierRow) {
    if (sortField === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let result = [...suppliers];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter((supplier) =>
        supplier.supplier.toLowerCase().includes(normalizedQuery),
      );
    }

    const minimum = Number.parseFloat(minSpend);
    if (!Number.isNaN(minimum) && minimum > 0) {
      result = result.filter((supplier) => supplier.totalSpend >= minimum);
    }

    result.sort((left, right) => {
      const leftValue = left[sortField];
      const rightValue = right[sortField];
      const comparison =
        typeof leftValue === "string"
          ? leftValue.localeCompare(rightValue as string)
          : (leftValue as number) - (rightValue as number);

      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [suppliers, query, minSpend, sortField, sortDir]);

  const totalSpend = suppliers.reduce((sum, supplier) => sum + supplier.totalSpend, 0);
  const totalVat = suppliers.reduce((sum, supplier) => sum + supplier.totalVat, 0);
  const totalExceptions = suppliers.reduce((sum, supplier) => sum + supplier.exceptions, 0);
  const totalRows = suppliers.reduce((sum, supplier) => sum + supplier.rowCount, 0);
  const topSuppliers = suppliers.slice(0, 5);
  const topByExceptions = [...suppliers]
    .filter((supplier) => supplier.exceptions > 0)
    .sort((left, right) => right.exceptions - left.exceptions)
    .slice(0, 4);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as SupplierTab)} className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="w-full overflow-x-auto whitespace-nowrap lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="directory">
            Directory
            <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              {filtered.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="text-sm text-[var(--muted)]">
          Supplier patterns help explain where spend is going and which payees need closer review.
        </div>
      </div>

      <TabsContent value="overview" className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Suppliers tracked",
              value: suppliers.length.toString(),
              note: "Unique payees across processed bookkeeping rows.",
            },
            {
              label: "Total spend",
              value: formatCurrency(totalSpend, currency),
              note: "All supplier-linked spend currently visible in this workspace.",
            },
            {
              label: "VAT identified",
              value: formatCurrency(totalVat, currency),
              note: "VAT extracted or attributed across supplier-linked rows.",
            },
            {
              label: "Exceptions",
              value: totalExceptions.toString(),
              note: "Rows with issues, mismatches, or review flags attached.",
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

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                Top suppliers
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                Biggest supplier relationships
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Start here when you want to understand where most of the outgoings are landing.
              </p>
            </div>

            {topSuppliers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--color-panel)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                No supplier activity yet. Process a run first to populate this view.
              </div>
            ) : (
              <div className="space-y-4">
                {topSuppliers.map((supplier) => {
                  const width = totalSpend > 0 ? Math.max((supplier.totalSpend / totalSpend) * 100, 6) : 6;
                  return (
                    <div key={supplier.supplier}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ink)]">
                            {supplier.supplier}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {supplier.rowCount} entr{supplier.rowCount === 1 ? "y" : "ies"} · {supplier.topGlCodes || "GL not assigned yet"}
                          </p>
                        </div>
                        <p className="font-mono text-sm font-semibold text-[var(--ink)]">
                          {formatCurrency(supplier.totalSpend, currency)}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#ece9e2]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--danger-soft)] p-2 text-[var(--danger)]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ink)]">Needs attention</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Suppliers that are creating the most review friction.
                  </p>
                </div>
              </div>

              {topByExceptions.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  No supplier exception hotspots right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {topByExceptions.map((supplier) => (
                    <div
                      key={supplier.supplier}
                      className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[var(--ink)]">{supplier.supplier}</p>
                        <span className="rounded-full bg-[var(--danger-soft)] px-2 py-1 text-xs font-semibold text-[var(--danger)]">
                          {supplier.exceptions} exception{supplier.exceptions === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Spend {formatCurrency(supplier.totalSpend, currency)} across {supplier.rowCount} linked rows.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3 bg-[linear-gradient(135deg,#faf8f2_0%,#f3ecde_100%)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-[var(--accent-ink)] shadow-[var(--shadow-sm)]">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--ink)]">What to do next</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Use this page as a spending lens, then jump into the underlying bookkeeping flow.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-[var(--ink-2)]">
                <li>Check the top suppliers against expected spend patterns.</li>
                <li>Review exception-heavy suppliers before relying on VAT and export totals.</li>
                <li>Open Transactions if a supplier needs recategorisation or cleanup.</li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/bookkeeping/transactions"
                  className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
                >
                  Review transactions
                </Link>
                <Link
                  href="/bookkeeping/reports"
                  className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
                >
                  Open reports
                </Link>
              </div>
            </Card>
          </div>
        </div>

        <Card className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
            Coverage
          </p>
          <p className="text-sm text-[var(--muted)]">
            This page currently summarizes {totalRows} supplier-linked bookkeeping row
            {totalRows === 1 ? "" : "s"} across {suppliers.length} supplier
            {suppliers.length === 1 ? "" : "s"}.
          </p>
        </Card>
      </TabsContent>

      <TabsContent value="directory" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search supplier name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted)]">Min spend</label>
            <input
              type="number"
              placeholder="0"
              value={minSpend}
              onChange={(event) => setMinSpend(event.target.value)}
              className="w-28 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          {query || minSpend ? (
            <button
              onClick={() => {
                setQuery("");
                setMinSpend("");
              }}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--color-panel)]"
            >
              Clear
            </button>
          ) : null}
          <div className="text-sm text-[var(--muted)] lg:ml-auto">
            {filtered.length} of {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
          </div>
        </div>

        {suppliers.length === 0 ? (
          <Card className="px-6 py-16 text-center text-sm text-[var(--muted)]">
            No supplier data yet. Process a run first to populate this view.
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="px-6 py-10 text-center text-sm text-[var(--muted)]">
            No suppliers match your filters.
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {filtered.map((supplier) => (
                <Card key={supplier.supplier} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--ink)]">
                        {supplier.supplier}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {supplier.rowCount} rows · VAT {supplier.avgVatRate.toFixed(1)}%
                      </p>
                    </div>
                    {supplier.exceptions > 0 ? (
                      <span className="rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--danger)]">
                        {supplier.exceptions} issue{supplier.exceptions === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        Spend
                      </p>
                      <p className="mt-1 font-mono font-semibold text-[var(--ink)]">
                        {formatCurrency(supplier.totalSpend, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
                        VAT
                      </p>
                      <p className="mt-1 font-mono font-semibold text-[var(--ink)]">
                        {formatCurrency(supplier.totalVat, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[var(--color-panel)] px-3 py-3 text-sm text-[var(--muted)]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-[var(--accent-ink)]" />
                      <span className="font-medium text-[var(--ink-2)]">Top GL codes</span>
                    </div>
                    <p className="mt-2 text-[var(--muted)]">{supplier.topGlCodes || "None yet"}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden overflow-hidden p-0 md:block">
              <div className="table-scroll">
                <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                  <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    <tr>
                      <th className="px-6 py-3">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("supplier")}>
                          Supplier
                          <SortIndicator active={sortField === "supplier"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("totalSpend")}>
                          Total spend
                          <SortIndicator active={sortField === "totalSpend"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("totalVat")}>
                          Total VAT
                          <SortIndicator active={sortField === "totalVat"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("avgVatRate")}>
                          Avg VAT %
                          <SortIndicator active={sortField === "avgVatRate"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("rowCount")}>
                          Rows
                          <SortIndicator active={sortField === "rowCount"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-right">
                        <button className="hover:text-[var(--ink)]" onClick={() => toggleSort("exceptions")}>
                          Exceptions
                          <SortIndicator active={sortField === "exceptions"} direction={sortDir} />
                        </button>
                      </th>
                      <th className="px-6 py-3">Top GL codes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {filtered.map((supplier) => (
                      <tr key={supplier.supplier} className="hover:bg-[var(--color-panel)]">
                        <td className="px-6 py-4 font-semibold text-[var(--ink)]">{supplier.supplier}</td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                          {formatCurrency(supplier.totalSpend, currency)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                          {formatCurrency(supplier.totalVat, currency)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                          {supplier.avgVatRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                          {supplier.rowCount}
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                          {supplier.exceptions > 0 ? (
                            <span className="font-semibold text-[var(--danger)]">
                              {supplier.exceptions}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[var(--muted)]">
                          {supplier.topGlCodes || "None yet"}
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
