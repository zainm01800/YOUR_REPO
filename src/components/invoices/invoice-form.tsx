"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client, Invoice, InvoiceLineItem } from "@/lib/domain/types";

interface InvoiceFormProps {
  clients: Pick<Client, "id" | "name" | "paymentTermsDays">[];
  invoice?: Invoice;
  defaultClientId?: string;
  currency: string;
}

const BLANK_LINE: InvoiceLineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 20,
  amount: 0,
  vatAmount: 0,
};

function calcLine(line: InvoiceLineItem): InvoiceLineItem {
  const amount = Number((line.quantity * line.unitPrice).toFixed(2));
  const vatAmount = Number(((amount * line.vatRate) / 100).toFixed(2));
  return { ...line, amount, vatAmount };
}

export function InvoiceForm({ clients, invoice, defaultClientId, currency }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "");
  const [clientId, setClientId] = useState(invoice?.clientId ?? defaultClientId ?? "");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lines, setLines] = useState<InvoiceLineItem[]>(
    invoice?.lineItems?.length ? invoice.lineItems : [{ ...BLANK_LINE }],
  );

  // Auto-set due date from client payment terms
  useEffect(() => {
    if (dueDate || invoice) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client || !issueDate) return;
    const due = new Date(issueDate);
    due.setDate(due.getDate() + (client.paymentTermsDays ?? 30));
    setDueDate(due.toISOString().slice(0, 10));
  }, [clientId, issueDate]);

  // Auto-load next invoice number on new invoices
  useEffect(() => {
    if (invoice || invoiceNumber) return;
    fetch("/api/invoices/next-number")
      .then((r) => r.json())
      .then((d) => { if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber); })
      .catch(() => {});
  }, []);

  const updateLine = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = calcLine({ ...updated[index], [field]: typeof value === "string" ? parseFloat(value) || 0 : value });
      if (field === "description") updated[index] = { ...updated[index], description: value as string };
      return updated;
    });
  };

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const totalVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  const total = subtotal + totalVat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Please select a client."); return; }
    if (lines.some((l) => !l.description.trim())) { setError("All line items need a description."); return; }
    setLoading(true);
    setError(null);

    const body = { clientId, invoiceNumber, issueDate, dueDate: dueDate || undefined, lineItems: lines, currency, notes: notes || undefined };

    try {
      const url = invoice ? `/api/invoices/${invoice.id}` : "/api/invoices";
      const method = invoice ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save invoice.");
        return;
      }
      const saved = await res.json() as Invoice;
      router.push(`/invoices/${saved.id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Header fields */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="mb-4 text-base font-semibold">Invoice details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Client <span className="text-[var(--color-danger)]">*</span></label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Invoice number <span className="text-[var(--color-danger)]">*</span></label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
              placeholder="INV-001"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Issue date <span className="text-[var(--color-danger)]">*</span></label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment details, bank info, etc."
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h2 className="mb-4 text-base font-semibold">Line items</h2>
        <div className="space-y-3">
          {/* Header row */}
          <div className="hidden grid-cols-[2fr_80px_110px_80px_100px_100px_36px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)] sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span>VAT %</span>
            <span className="text-right">Net</span>
            <span className="text-right">VAT</span>
            <span />
          </div>

          {lines.map((line, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 sm:grid-cols-[2fr_80px_110px_80px_100px_100px_36px] sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
            >
              <input
                placeholder="Description of service or product"
                value={line.description}
                onChange={(e) => {
                  const updated = [...lines];
                  updated[i] = { ...updated[i], description: e.target.value };
                  setLines(updated);
                }}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.quantity}
                onChange={(e) => updateLine(i, "quantity", e.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={line.vatRate}
                onChange={(e) => updateLine(i, "vatRate", e.target.value)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              <div className="text-right text-sm tabular-nums font-medium">{fmt(line.amount)}</div>
              <div className="text-right text-sm tabular-nums text-[var(--color-muted-foreground)]">{fmt(line.vatAmount)}</div>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={lines.length === 1}
                className="flex items-center justify-center rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, { ...BLANK_LINE }])}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          Add line item
        </button>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Subtotal</span>
              <span className="tabular-nums font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">VAT</span>
              <span className="tabular-nums">{fmt(totalVat)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums text-lg">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : invoice ? "Save changes" : "Create invoice"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
