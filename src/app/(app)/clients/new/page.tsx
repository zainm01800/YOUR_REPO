import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";

export const metadata = { title: "New Client" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Add client"
        description="Add a new client to create invoices for."
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "New client" },
        ]}
      />
      <ClientForm />
    </>
  );
}
