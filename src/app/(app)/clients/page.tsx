import Link from "next/link";
import { Upload, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Clients" };

// Deterministic pastel colour from a string
const AVATAR_PALETTES = [
  { bg: "bg-[rgba(58,85,153,0.12)]", text: "text-[#3a5599]" },
  { bg: "bg-[rgba(16,124,75,0.12)]", text: "text-[#107a4b]" },
  { bg: "bg-[rgba(180,83,9,0.12)]", text: "text-[#b45309]" },
  { bg: "bg-[rgba(124,58,237,0.12)]", text: "text-[#7c3aed]" },
  { bg: "bg-[rgba(220,38,38,0.12)]", text: "text-[#dc2626]" },
  { bg: "bg-[rgba(2,132,199,0.12)]", text: "text-[#0284c7]" },
];

function avatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

export default async function ClientsPage() {
  const repository = await getRepository();
  const [clients, settings] = await Promise.all([
    repository.getClients(),
    repository.getSettingsSnapshot(),
  ]);
  const currency = settings.workspace.defaultCurrency ?? "GBP";

  const totalOutstanding = clients.reduce((s, c) => s + (c.outstandingAmount ?? 0), 0);
  const totalInvoiced = clients.reduce((s, c) => s + (c.totalInvoiced ?? 0), 0);
  const activeThisYear = clients.filter((c) => (c.invoiceCount ?? 0) > 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Clients"
        description="Manage your clients and track what they owe you."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Link href="/clients/new">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                New client
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total clients", value: clients.length, sub: "registered" },
          { label: "Active this year", value: activeThisYear, sub: "with invoices" },
          { label: "Total invoiced", value: formatCurrency(totalInvoiced, currency), sub: "all time" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              {s.label}
            </span>
            <span className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
              {s.value}
            </span>
            <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{s.sub}</span>
          </div>
        ))}
      </div>

      {clients.length === 0 ? (
        <div className="cm-empty p-12">
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
        <div className="cm-table-wrap">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="cm-table-head text-left">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3 text-right">Invoices</th>
                <th className="px-5 py-3 text-right">Total invoiced</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {clients.map((client) => {
                const palette = avatarPalette(client.name);
                const initials = client.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("");
                return (
                  <tr key={client.id} className="group hover:bg-white/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${palette.bg} ${palette.text}`}
                        >
                          {initials}
                        </div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)] hover:underline"
                        >
                          {client.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-muted-foreground)]">
                      {client.email ?? "-"}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
