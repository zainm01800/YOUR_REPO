import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const repository = await getRepository();
  const [clients, settings] = await Promise.all([
    repository.getClients(),
    repository.getSettingsSnapshot(),
  ]);
  const currency = settings.workspace.defaultCurrency ?? "GBP";

  const totalOutstanding = clients.reduce((s, c) => s + (c.outstandingAmount ?? 0), 0);
  const totalInvoiced = clients.reduce((s, c) => s + (c.totalInvoiced ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Clients"
        description="Manage your clients and track what they owe you."
        actions={
          <Link href="/clients/new">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add client
            </Button>
          </Link>
        }
      />

      {/* Summary pills */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Clients", value: clients.length },
          { label: "Total invoiced", value: formatCurrency(totalInvoiced, currency) },
          { label: "Outstanding", value: formatCurrency(totalOutstanding, currency) },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4 text-center"
          >
            <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-12 text-center">
          <UserPlus className="mx-auto mb-3 h-8 w-8 text-[var(--color-muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--color-foreground)]">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Add your first client to start creating invoices.
          </p>
          <Link href="/clients/new" className="mt-4 inline-block">
            <Button className="h-8 px-3 text-xs">Add client</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3 text-right">Invoices</th>
                <th className="px-5 py-3 text-right">Total invoiced</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {clients.map((client) => (
                <tr key={client.id} className="group hover:bg-white/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--color-foreground)]">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:text-[var(--color-accent)] hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted-foreground)]">
                    {client.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                    {client.invoiceCount ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-[var(--color-foreground)]">
                    {formatCurrency(client.totalInvoiced ?? 0, currency)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span
                      className={
                        (client.outstandingAmount ?? 0) > 0
                          ? "font-semibold text-amber-600"
                          : "text-[var(--color-muted-foreground)]"
                      }
                    >
                      {formatCurrency(client.outstandingAmount ?? 0, currency)}
                    </span>
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
