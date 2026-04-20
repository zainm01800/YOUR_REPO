"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExpenseFormProps {
  categories: string[];
  vatCodes: string[];
  currency: string;
  onSaved: () => void;
  onCancel: () => void;
}

const HMRC_MILEAGE_RATE = 0.45; // £0.45 per mile (first 10,000 miles)

export function ExpenseForm({ categories, vatCodes, currency, onSaved, onCancel }: ExpenseFormProps) {
  const [isMileage, setIsMileage] = useState(false);
  const [miles, setMiles] = useState("");
  const [rate, setRate] = useState(HMRC_MILEAGE_RATE.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mileageAmount = isMileage ? Math.round(parseFloat(miles || "0") * parseFloat(rate || "0") * 100) / 100 : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const body = {
      date: fd.get("date") as string,
      description: fd.get("description") as string,
      merchant: (fd.get("merchant") as string) || undefined,
      category: (fd.get("category") as string) || undefined,
      vatCode: (fd.get("vatCode") as string) || undefined,
      amount: isMileage ? mileageAmount : parseFloat(fd.get("amount") as string),
      currency,
      isMileage,
      mileageMiles: isMileage ? parseFloat(miles) || undefined : undefined,
      mileageRatePerMile: isMileage ? parseFloat(rate) || undefined : undefined,
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save expense.");
        return;
      }
      onSaved();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        {isMileage ? "Log mileage" : "Add expense"}
      </h3>

      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-2">
        {["Expense", "Mileage"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setIsMileage(type === "Mileage")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              (type === "Mileage") === isMileage
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-accent)]"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date <span className="text-[var(--color-danger)]">*</span></label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {isMileage ? "Trip description" : "Description"} <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            name="description"
            required
            placeholder={isMileage ? "Client meeting — London to Birmingham" : "Office supplies from Amazon"}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>

        {isMileage ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Miles <span className="text-[var(--color-danger)]">*</span></label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                required
                placeholder="0"
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Rate per mile</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">HMRC approved rate: £0.45/mile (first 10,000 miles)</p>
            </div>
            {miles && (
              <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Deductible amount: <strong>£{mileageAmount.toFixed(2)}</strong> ({miles} miles × £{rate}/mile)
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Supplier / Merchant</label>
              <input
                name="merchant"
                placeholder="Amazon, Staples…"
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Amount (gross) <span className="text-[var(--color-danger)]">*</span></label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">{currency}</span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Category</label>
          <select
            name="category"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {!isMileage && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">VAT code</label>
            <select
              name="vatCode"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
            >
              <option value="">None</option>
              {vatCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Notes</label>
          <input
            name="notes"
            placeholder="Any additional notes…"
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isMileage ? "Log mileage" : "Add expense"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
