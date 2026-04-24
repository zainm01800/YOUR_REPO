import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Client" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  sent: "cm-status-accent",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]",
  void: "bg-gray-50 text-gray-400 border-gray-200",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const repository = await getRepository();
  const [client, invoices, settings] = await Promise.all([
    repository.getClient(clientId),
    repository.getInvoices(),
    repository.getSettingsSnapshot(),
  ]);

  if (!client) notFound();

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const clientInvoices = invoices.filter((inv) => inv.clientId === clientId);

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title={client.name}
        description={client.email ?? "No email on file"}
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: client.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={`/invoices/new?clientId=${clientId}`}>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                New invoice
              </Button>
            </Link>
            <Link href={`/clients/${clientId}/edit`}>
              <Button variant="secondary">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Client details card */}
      <div className="cm-panel-subtle p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--color-foreground)]">Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          {[
            { label: "Email", value: client.email },
            { label: "Phone", value: client.phone },
            { label: "VAT number", value: client.vatNumber },
            { label: "Payment terms", value: client.paymentTermsDays ? `${client.paymentTermsDays} days` : null },
            {
              label: "Address",
              value: [client.addressLine1, client.addressLine2, client.city, client.postcode, client.country]
                .filter(Boolean)
                .join(", "),
            },
          ]
            .filter((d) => d.value)
            .map((d) => (
              <div key={d.label}>
                <dt className="text-[var(--color-muted-foreground)]">{d.label}</dt>
                <dd className="mt-0.5 font-medium text-[var(--color-foreground)]">{d.value}</dd>
              </div>
            ))}
        </dl>
        {client.notes && (
          <div className="mt-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border)] p-3 text-sm text-[var(--color-muted-foreground)]">
            {client.notes}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="cm-panel-subtle p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">Invoices</h2>
          <Link href={`/invoices/new?clientId=${clientId}`}>
            <Button className="h-8 px-3 text-xs" variant="secondary">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              New invoice
            </Button>
          </Link>
        </div>

        {clientInvoices.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-5 text-sm text-[var(--color-muted-foreground)]">
            No invoices for this client yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issue date</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-panel)]">
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/60 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="hover:text-[var(--color-accent)] hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status] ?? ""}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
