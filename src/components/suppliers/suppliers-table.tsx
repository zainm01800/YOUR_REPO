"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export function SuppliersTable({
  suppliers,
  currency,
}: {
  suppliers: SupplierRow[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [sortField, setSortField] = useState<keyof SupplierRow>("totalSpend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(field: keyof SupplierRow) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let result = [...suppliers];
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((s) => s.supplier.toLowerCase().includes(q));
    const min = parseFloat(minSpend);
    if (!isNaN(min) && min > 0) result = result.filter((s) => s.totalSpend >= min);
    result.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [suppliers, query, minSpend, sortField, sortDir]);

  function SortIndicator({ field }: { field: keyof SupplierRow }) {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search supplier name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-muted-foreground)]">Min spend:</label>
          <input
            type="number"
            placeholder="0"
            value={minSpend}
            onChange={(e) => setMinSpend(e.target.value)}
            className="w-28 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        {(query || minSpend) && (
          <button
            onClick={() => { setQuery(""); setMinSpend(""); }}
            className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
          >
            Clear
          </button>
        )}
        <Link
          href="/suppliers"
          className="ml-auto text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          {filtered.length} of {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
        </Link>
      </div>

      <Card className="overflow-hidden p-0">
        {suppliers.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
            No supplier data yet. Process a run first to populate this view.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            No suppliers match your filters.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-6 py-3">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("supplier")}>
                    Supplier <SortIndicator field="supplier" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("totalSpend")}>
                    Total spend <SortIndicator field="totalSpend" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("totalVat")}>
                    Total VAT <SortIndicator field="totalVat" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("avgVatRate")}>
                    Avg VAT % <SortIndicator field="avgVatRate" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("rowCount")}>
                    Rows <SortIndicator field="rowCount" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button className="hover:text-[var(--color-foreground)]" onClick={() => toggleSort("exceptions")}>
                    Exceptions <SortIndicator field="exceptions" />
                  </button>
                </th>
                <th className="px-6 py-3">Top GL codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((s) => (
                <tr key={s.supplier} className="hover:bg-[var(--color-panel)]">
                  <td className="px-6 py-4 font-semibold text-[var(--color-foreground)]">{s.supplier}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(s.totalSpend, currency)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(s.totalVat, currency)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{s.avgVatRate.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right tabular-nums">{s.rowCount}</td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {s.exceptions > 0 ? (
                      <span className="font-semibold text-[var(--color-danger)]">{s.exceptions}</span>
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-muted-foreground)]">{s.topGlCodes || "None yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
