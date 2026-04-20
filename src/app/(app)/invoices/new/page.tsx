import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getRepository } from "@/lib/data";

export const metadata = { title: "New Invoice" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const repository = await getRepository();
  const [clients, settings] = await Promise.all([
    repository.getClients(),
    repository.getSettingsSnapshot(),
  ]);
  const currency = settings.workspace.defaultCurrency ?? "GBP";

  return (
    <>
      <PageHeader
        eyebrow="Invoices"
        title="New invoice"
        description="Create a new invoice for a client."
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: "New invoice" },
        ]}
      />
      <InvoiceForm
        clients={clients.map((c) => ({ id: c.id, name: c.name, paymentTermsDays: c.paymentTermsDays }))}
        defaultClientId={clientId}
        currency={currency}
      />
    </>
  );
}
