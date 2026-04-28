import { PageHeader } from "@/components/app-shell/page-header";
import { BankStatementsTable } from "@/components/bank-statements/bank-statements-table";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Statements",
};

export default async function BankStatementsPage() {
  const { repository, viewerAccess } = await getServerViewerAccess();
  const statements = await repository.getBankStatementSummaries();

  return (
    <>
      <PageHeader
        eyebrow="Bank Statements"
        title="Import and reuse bank transaction sources"
        description="Upload bank or card statements once, review the imported transactions centrally, and then reuse that source data across reconciliation runs."
      />
      <BankStatementsTable
        statements={statements}
        canManageOperationalData={viewerAccess.canManageOperationalData}
      />
    </>
  );
}
