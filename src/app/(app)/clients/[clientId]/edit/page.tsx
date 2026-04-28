import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";

export const metadata = { title: "Edit Client" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { repository, viewerAccess } = await getServerViewerAccess();
  if (!viewerAccess.canManageOperationalData) {
    redirect(`/clients/${clientId}`);
  }
  const client = await repository.getClient(clientId);
  if (!client) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title={`Edit ${client.name}`}
        description="Update the client's details."
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: client.name, href: `/clients/${clientId}` },
          { label: "Edit" },
        ]}
      />
      <ClientForm client={client} />
    </>
  );
}
