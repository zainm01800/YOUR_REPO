import { PageHeader } from "@/components/app-shell/page-header";
import { BankStatementsTable } from "@/components/bank-statements/bank-statements-table";
import { getRepository } from "@/lib/data";

export default async function BankStatementsPage() {
  const repository = await getRepository();
  const statements = await repository.getBankStatementSummaries();

  return (
    <>
      <PageHeader
        eyebrow="Bank Statements"
        title="Import and reuse bank transaction sources"
        description="Upload bank or card statements once, review the imported transactions centrally, and then reuse that source data across reconciliation runs."
      />
      <BankStatementsTable statements={statements} />
    </>
  );
}
