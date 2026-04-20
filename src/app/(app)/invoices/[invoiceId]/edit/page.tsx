import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Edit Invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const repository = await getRepository();
  const [invoice, clients, settings] = await Promise.all([
    repository.getInvoice(invoiceId),
    repository.getClients(),
    repository.getSettingsSnapshot(),
  ]);
  if (!invoice) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Invoices"
        title={`Edit ${invoice.invoiceNumber}`}
        description="Update line items, dates, or client."
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber, href: `/invoices/${invoiceId}` },
          { label: "Edit" },
        ]}
      />
      <InvoiceForm
        invoice={invoice}
        clients={clients.map((c) => ({ id: c.id, name: c.name, paymentTermsDays: c.paymentTermsDays }))}
        currency={settings.workspace.defaultCurrency ?? "GBP"}
      />
    </>
  );
}
