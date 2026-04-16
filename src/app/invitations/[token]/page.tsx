import { AcceptInvitationButton } from "@/components/invitations/accept-invitation-button";

export default async function InvitationPage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  return (
    <div style={{ padding: 40, fontFamily: "monospace", maxWidth: 400 }}>
      <h1>Invitation diagnostic</h1>
      <p>Token: {params.token}</p>
      <div style={{ marginTop: 20 }}>
        <AcceptInvitationButton token={params.token} />
      </div>
    </div>
  );
}
