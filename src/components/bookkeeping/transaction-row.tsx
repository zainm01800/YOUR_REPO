import { memo } from "react";
import { CheckCircle2, Tag, Sparkles } from "lucide-react";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  TAX_TREATMENT_LABELS,
} from "@/lib/accounting/classifier";

export function fmtAmount(amount: number, currency: string) {
  const CURRENCY_SYMBOLS: Record<string, string> = {
    GBP: "£", USD: "$", EUR: "€", CHF: "Fr", SEK: "kr", NOK: "kr", DKK: "kr",
  };
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

export function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface TransactionRowProps {
  tx: any; // Using any for swift extraction; ideally should use TransactionRow from parent
  isSelected: boolean;
  toggleRow: (id: string) => void;
  isEditing: boolean;
  isSaving: boolean;
  justSaved: boolean;
  editValue: string;
  setEditingId: (id: string | null) => void;
  setEditValue: (val: string) => void;
  handleSaveCategory: (id: string, newCategory: string) => void;
  handleToggleAllowable: (category: string, currentVal: boolean) => void;
  visibleCategories: string[];
}

export const TransactionRowComponent = memo(function TransactionRowComponent({
  tx,
  isSelected,
  toggleRow,
  isEditing,
  isSaving,
  justSaved,
  editValue,
  setEditingId,
  setEditValue,
  handleSaveCategory,
  handleToggleAllowable,
  visibleCategories,
}: TransactionRowProps) {
  const categoryOptions = tx.resolvedCategory && !visibleCategories.includes(tx.resolvedCategory)
    ? [...visibleCategories, tx.resolvedCategory].sort((a, b) => a.localeCompare(b))
    : visibleCategories;

  return (
    <tr className={`transition ${isSelected ? "bg-red-50" : "hover:bg-[var(--color-accent-soft)]"}`}>
      <td className="px-4 py-3 border-t border-[var(--color-border)]">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleRow(tx.id)}
          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
        />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)] border-t border-[var(--color-border)]">
        {fmtDate(tx.transactionDate || "")}
      </td>
      <td className="px-4 py-3 font-medium text-[var(--color-foreground)] border-t border-[var(--color-border)]">
        {tx.merchant}
      </td>
      <td className="hidden max-w-[220px] px-4 py-3 text-[var(--color-muted-foreground)] sm:table-cell border-t border-[var(--color-border)]">
        <span className="line-clamp-1">{tx.description}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[var(--color-foreground)] border-t border-[var(--color-border)]">
        {fmtAmount(tx.amount, tx.currency)}
        {tx.currency !== "GBP" && (
          <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">{tx.currency}</span>
        )}
      </td>
      <td className="px-4 py-3 border-t border-[var(--color-border)]">
        {isEditing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveCategory(tx.id, editValue);
            }}
            className="flex items-center gap-1"
          >
            <select
              autoFocus
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              className="h-7 w-36 rounded-lg border border-[var(--color-accent)] bg-white px-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="" disabled>Select category…</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSaving}
              className="h-7 rounded-lg bg-[var(--color-accent)] px-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-7 rounded-lg border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingId(tx.id);
              setEditValue(tx.resolvedCategory || "");
            }}
            className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition hover:bg-[var(--color-panel)]"
          >
            {justSaved ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Tag className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent)]" />
            )}
            {tx.category ? (
               <span className="font-medium text-[var(--color-foreground)]">{tx.resolvedCategory}</span>
            ) : tx.resolvedCategory ? (
               <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[var(--color-foreground)]">{tx.resolvedCategory}</span>
                  <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-50 text-[9px] font-bold text-violet-600 ring-1 ring-violet-200 uppercase tracking-tighter">
                    <Sparkles className="h-2 w-2" /> Auto
                  </span>
               </div>
            ) : (
              <span className="italic text-[var(--color-muted-foreground)]">Uncategorised</span>
            )}
          </button>
        )}
      </td>
      <td className="hidden px-4 py-3 lg:table-cell border-t border-[var(--color-border)]">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            ACCOUNT_TYPE_COLORS[tx.accountType as keyof typeof ACCOUNT_TYPE_COLORS]
          }`}
        >
          {ACCOUNT_TYPE_LABELS[tx.accountType as keyof typeof ACCOUNT_TYPE_LABELS] ?? tx.accountType}
        </span>
      </td>
      <td className="hidden px-4 py-3 text-center xl:table-cell border-t border-[var(--color-border)]">
        {tx.supportsAllowability ? (
          <input
            type="checkbox"
            checked={tx.allowableForTax}
            disabled={!tx.resolvedCategory}
            onChange={() => handleToggleAllowable(tx.resolvedCategory, !!tx.allowableForTax)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--color-border)] accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            title={tx.resolvedCategory ? `Toggle allowability for all ${tx.resolvedCategory} items` : "Set a category first"}
          />
        ) : (
          <span className="text-[var(--color-muted-foreground)] text-xs">—</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] xl:table-cell border-t border-[var(--color-border)]">
        {TAX_TREATMENT_LABELS[tx.taxTreatment as keyof typeof TAX_TREATMENT_LABELS] ?? "Unknown"}
      </td>
      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] md:table-cell border-t border-[var(--color-border)]">
        {tx.runName}
      </td>
      <td className="hidden px-4 py-3 text-xs text-[var(--color-muted-foreground)] lg:table-cell border-t border-[var(--color-border)]">
        {tx.employee || "—"}
      </td>
    </tr>
  );
});
