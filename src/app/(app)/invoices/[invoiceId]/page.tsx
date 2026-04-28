import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MarkPaidButton } from "@/components/invoices/mark-paid-button";

export const metadata = { title: "Invoice" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  sent: "cm-status-accent",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]",
  void: "bg-gray-50 text-gray-400 border-gray-200",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { repository, viewerAccess } = await getServerViewerAccess();
  const invoice = await repository.getInvoice(invoiceId);
  if (!invoice) notFound();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: invoice.currency }).format(n);

  return (
    <>
      <PageHeader
        eyebrow="Invoices"
        title={invoice.invoiceNumber}
        description={`${invoice.client.name} - Issued ${formatDate(invoice.issueDate)}`}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <div className="flex gap-2">
            {viewerAccess.canManageOperationalData &&
              invoice.status !== "paid" &&
              invoice.status !== "void" && (
              <MarkPaidButton invoiceId={invoiceId} total={invoice.total} />
            )}
            {viewerAccess.canManageOperationalData && invoice.status === "draft" && (
              <Link href={`/invoices/${invoiceId}/edit`}>
                <Button variant="secondary">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Status banner */}
      <div
        className={`flex items-center gap-3 rounded-2xl border p-4 ${
          invoice.status === "paid"
            ? "border-emerald-200 bg-emerald-50"
            : invoice.status === "overdue"
              ? "border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]"
              : "border-[var(--color-border)] bg-[var(--color-panel)]"
        }`}
      >
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold capitalize ${STATUS_STYLES[invoice.status] ?? ""}`}
        >
          {invoice.status}
        </span>
        {invoice.status === "paid" && invoice.paidAt && (
          <span className="text-sm text-emerald-700">
            Paid on {formatDate(invoice.paidAt)} for {fmt(invoice.paidAmount ?? invoice.total)}
          </span>
        )}
        {invoice.dueDate && invoice.status !== "paid" && invoice.status !== "void" && (
          <span className="text-sm text-[var(--color-muted-foreground)]">
            Due {formatDate(invoice.dueDate)}
          </span>
        )}
      </div>

      {/* Invoice body */}
      <div className="cm-panel-subtle p-5">
        {/* Client block */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Bill to</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{invoice.client.name}</p>
            {invoice.client.email && (
              <p className="text-sm text-[var(--color-muted-foreground)]">{invoice.client.email}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Invoice details</p>
            <p className="mt-1 font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">Issued: {formatDate(invoice.issueDate)}</p>
            {invoice.dueDate && (
              <p className="text-sm text-[var(--color-muted-foreground)]">Due: {formatDate(invoice.dueDate)}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit price</th>
                <th className="px-4 py-3 text-right">VAT %</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">VAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-panel)]">
              {invoice.lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">{li.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{li.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(li.unitPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{li.vatRate}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(li.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">{fmt(li.vatAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Subtotal</span>
              <span className="tabular-nums font-medium">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">VAT</span>
              <span className="tabular-nums">{fmt(invoice.vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-bold">
              <span>Total</span>
              <span className="tabular-nums text-lg">{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm text-[var(--color-muted-foreground)]">
            <p className="mb-1 font-medium text-[var(--color-foreground)]">Notes</p>
            {invoice.notes}
          </div>
        )}
      </div>
    </>
  );
}
