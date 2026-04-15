import type { BankStatement } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type ReconStatus = BankStatement["transactions"][number]["reconciliationStatus"];

function transactionStatusLabel(status: ReconStatus) {
  return status.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: ReconStatus }) {
  const styles: Partial<Record<ReconStatus, string>> = {
    matched: "bg-emerald-50 text-emerald-700 border-emerald-200",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    unreconciled: "bg-slate-50 text-slate-600 border-slate-200",
    suggested_match: "bg-blue-50 text-blue-700 border-blue-200",
    partially_matched: "bg-amber-50 text-amber-700 border-amber-200",
    excluded: "bg-rose-50 text-rose-600 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {transactionStatusLabel(status)}
    </span>
  );
}

export function BankStatementDetail({
  statement,
}: {
  statement: BankStatement;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Transactions</div>
          <div className="mt-3 text-4xl font-semibold">{statement.transactionCount}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Currency</div>
          <div className="mt-3 text-4xl font-semibold">{statement.currency}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Date range</div>
          <div className="mt-3 text-base font-semibold">
            {statement.dateRangeStart && statement.dateRangeEnd
              ? `${statement.dateRangeStart} → ${statement.dateRangeEnd}`
              : "Unavailable"}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-[var(--color-muted-foreground)]">Import status</div>
          <div className="mt-3 text-base font-semibold capitalize">{statement.importStatus}</div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="table-scroll">
        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Merchant</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Reconciliation status</th>
              <th className="px-6 py-4">Linked run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {statement.transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4">{transaction.transactionDate || transaction.postedDate || "—"}</td>
                <td className="px-6 py-4 font-medium">{transaction.merchant}</td>
                <td className="px-6 py-4 text-[var(--color-muted-foreground)]">{transaction.description}</td>
                <td className="px-6 py-4">{formatCurrency(Math.abs(transaction.amount), transaction.currency || statement.currency)}</td>
                <td className="px-6 py-4"><StatusBadge status={transaction.reconciliationStatus} /></td>
                <td className="px-6 py-4 text-[var(--color-muted-foreground)]">{transaction.matchedRunName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
