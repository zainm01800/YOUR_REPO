import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Edit Client" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const repository = await getRepository();
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
