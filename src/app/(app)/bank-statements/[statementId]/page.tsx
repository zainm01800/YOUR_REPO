import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { BankStatementDetail } from "@/components/bank-statements/bank-statement-detail";
import { getRepository } from "@/lib/data";

export default async function BankStatementDetailPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = await params;
  const repository = await getRepository();
  const statement = await repository.getBankStatement(statementId);

  if (!statement) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Bank Statements"
        title={statement.name}
        description="Review the imported transaction source, see reconciliation status per line, and reuse it in future runs."
      />
      <BankStatementDetail statement={statement} />
    </>
  );
}
