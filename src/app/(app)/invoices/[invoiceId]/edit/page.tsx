import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";

export const metadata = { title: "Edit Invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { repository, workspace, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canManageOperationalData) {
    redirect(`/invoices/${invoiceId}`);
  }
  const [invoice, clients] = await Promise.all([
    repository.getInvoice(invoiceId),
    repository.getClients(),
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
        currency={workspace.defaultCurrency ?? "GBP"}
      />
    </>
  );
}
