import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { redirect } from "next/navigation";

export const metadata = { title: "New Client" };

export default async function NewClientPage() {
  const { viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canManageOperationalData) {
    redirect("/clients");
  }

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
