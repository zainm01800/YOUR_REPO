export default async function InvitationPage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Invitation diagnostic</h1>
      <p>Token: {params.token}</p>
    </div>
  );
}
