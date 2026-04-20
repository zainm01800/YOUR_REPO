import Link from "next/link";
import { FilePlus } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Invoices" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]",
  void: "bg-gray-50 text-gray-400 border-gray-200",
};

export default async function InvoicesPage() {
  const repository = await getRepository();
  const [invoices, settings] = await Promise.all([
    repository.getInvoices(),
    repository.getSettingsSnapshot(),
  ]);
  const currency = settings.workspace.defaultCurrency ?? "GBP";

  const totalDraft = invoices.filter((i) => i.status === "draft").reduce((s, i) => s + i.total, 0);
  const totalSent = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.paidAmount ?? i.total), 0);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Invoices"
        description="Track what you've invoiced and what's been paid."
        actions={
          <Link href="/invoices/new">
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              New invoice
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Draft", value: formatCurrency(totalDraft, currency), tone: "neutral" },
          { label: "Outstanding", value: formatCurrency(totalSent, currency), tone: totalSent > 0 ? "warning" : "neutral" },
          { label: "Paid", value: formatCurrency(totalPaid, currency), tone: "success" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center rounded-2xl border px-5 py-4 text-center ${
              s.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : s.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-foreground)]"
            }`}
          >
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-wide opacity-70">{s.label}</span>
          </div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-12 text-center">
          <FilePlus className="mx-auto mb-3 h-8 w-8 text-[var(--color-muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--color-foreground)]">No invoices yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create your first invoice to start tracking payments.</p>
          <Link href="/invoices/new" className="mt-4 inline-block">
            <Button className="h-8 px-3 text-xs">Create invoice</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Issue date</th>
                <th className="px-5 py-3">Due date</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/60 transition-colors">
                  <td className="px-5 py-3 font-medium">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="hover:text-[var(--color-accent)] hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted-foreground)]">
                    <Link href={`/clients/${inv.clientId}`} className="hover:text-[var(--color-accent)]">
                      {inv.client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status] ?? ""}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted-foreground)]">{formatDate(inv.issueDate)}</td>
                  <td className="px-5 py-3 text-[var(--color-muted-foreground)]">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
