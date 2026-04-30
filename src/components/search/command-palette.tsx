"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchItem {
  label: string;
  description?: string;
  href: string;
  category: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: "Dashboard", href: "/dashboard", category: "Pages" },
  { label: "Bank Statements", href: "/bank-statements", category: "Pages" },
  { label: "Import bank statement", href: "/bank-statements/import", category: "Actions" },
  { label: "Transactions", href: "/bookkeeping/transactions", category: "Pages" },
  { label: "Expenses", href: "/expenses", category: "Pages" },
  { label: "Mileage", href: "/mileage", category: "Pages" },
  { label: "Invoices", href: "/invoices", category: "Pages" },
  { label: "New invoice", href: "/invoices/new", category: "Actions" },
  { label: "Clients", href: "/clients", category: "Pages" },
  { label: "New client", href: "/clients/new", category: "Actions" },
  { label: "Tax Summary", href: "/bookkeeping/tax-summary", category: "Reports" },
  { label: "Financial Reports", href: "/bookkeeping/reports", category: "Reports" },
  { label: "Budget vs. Actual", href: "/bookkeeping/budget", category: "Reports" },
  { label: "Spending Analysis", href: "/bookkeeping/spending", category: "Reports" },
  { label: "Missing Receipts", href: "/bookkeeping/missing-receipts", category: "Review" },
  { label: "Settings", href: "/settings", category: "Settings" },
  { label: "Invite member", description: "Open invite dialog", href: "/settings?tab=team", category: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query
    ? SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_ITEMS.slice(0, 8);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[selected]) navigate(filtered[selected].href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <kbd className="hidden rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] sm:block">ESC</kbd>
          <button type="button" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-[var(--muted)] hover:text-[var(--ink)]" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">No results for &quot;{query}&quot;</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelected(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${i === selected ? "bg-[var(--color-accent-soft)]" : "hover:bg-[var(--bg)]"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${i === selected ? "text-[var(--color-accent)]" : "text-[var(--ink)]"}`}>{item.label}</p>
                  {item.description && <p className="text-xs text-[var(--muted)] truncate">{item.description}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{item.category}</span>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-[var(--line)] px-4 py-2 flex items-center gap-3 text-[10px] text-[var(--muted)]">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
