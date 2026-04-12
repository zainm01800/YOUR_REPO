import type { BankStatement } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

function transactionStatusLabel(status: BankStatement["transactions"][number]["reconciliationStatus"]) {
  return status.replace(/_/g, " ");
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
                <td className="px-6 py-4 capitalize">{transactionStatusLabel(transaction.reconciliationStatus)}</td>
                <td className="px-6 py-4 text-[var(--color-muted-foreground)]">{transaction.matchedRunName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
