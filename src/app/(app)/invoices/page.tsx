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

const FILTER_TABS = ["All", "Overdue", "Sent", "Paid", "Draft"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const activeTab = (params.filter as FilterTab) ?? "All";

  const repository = await getRepository();
  const [invoices, settings] = await Promise.all([
    repository.getInvoices(),
    repository.getSettingsSnapshot(),
  ]);
  const currency = settings.workspace.defaultCurrency ?? "GBP";

  // Compute effective status (sent + overdue date → overdue)
  const now = new Date();
  const withEffectiveStatus = invoices.map((inv) => ({
    ...inv,
    effectiveStatus:
      inv.status === "sent" && inv.dueDate && new Date(inv.dueDate) < now
        ? "overdue"
        : inv.status,
  }));

  const totalDraft = invoices
    .filter((i) => i.status === "draft")
    .reduce((s, i) => s + i.total, 0);
  const totalOutstanding = withEffectiveStatus
    .filter((i) => i.effectiveStatus === "sent" || i.effectiveStatus === "overdue")
    .reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (i.paidAmount ?? i.total), 0);

  const filtered = withEffectiveStatus.filter((inv) => {
    if (activeTab === "All") return true;
    return inv.effectiveStatus === activeTab.toLowerCase();
  });

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

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Draft", value: formatCurrency(totalDraft, currency), tone: "neutral" },
          {
            label: "Outstanding",
            value: formatCurrency(totalOutstanding, currency),
            tone: totalOutstanding > 0 ? "warning" : "neutral",
          },
          { label: "Paid", value: formatCurrency(totalPaid, currency), tone: "success" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col rounded-2xl border px-5 py-4 ${
              s.tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : s.tone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[var(--color-border)] bg-[var(--color-panel)]"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              {s.label}
            </span>
            <span
              className={`mt-1.5 text-2xl font-bold tabular-nums ${
                s.tone === "warning"
                  ? "text-amber-700"
                  : s.tone === "success"
                    ? "text-emerald-700"
                    : "text-[var(--color-foreground)]"
              }`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-1 w-fit">
        {FILTER_TABS.map((tab) => {
          const count =
            tab === "All"
              ? withEffectiveStatus.length
              : withEffectiveStatus.filter((i) => i.effectiveStatus === tab.toLowerCase()).length;
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={`/invoices?filter=${tab}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {tab}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "bg-[var(--color-border)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-12 text-center">
          <FilePlus className="mx-auto mb-3 h-8 w-8 text-[var(--color-muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {activeTab === "All" ? "No invoices yet" : `No ${activeTab.toLowerCase()} invoices`}
          </p>
          {activeTab === "All" && (
            <>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Create your first invoice to start tracking payments.
              </p>
              <Link href="/invoices/new" className="mt-4 inline-block">
                <Button className="h-8 px-3 text-xs">Create invoice</Button>
              </Link>
            </>
          )}
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
              {filtered.map((inv) => (
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
                    <Link
                      href={`/clients/${inv.clientId}`}
                      className="hover:text-[var(--color-accent)]"
                    >
                      {inv.client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.effectiveStatus] ?? ""}`}
                    >
                      {inv.effectiveStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted-foreground)]">
                    {formatDate(inv.issueDate)}
                  </td>
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
