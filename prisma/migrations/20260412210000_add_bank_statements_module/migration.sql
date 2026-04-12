-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "bankName" TEXT,
    "accountName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importStatus" TEXT NOT NULL DEFAULT 'imported',
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "previewHeaders" JSONB,
    "savedColumnMappings" JSONB,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceLineNumber" INTEGER,
    "transactionDate" TIMESTAMP(3),
    "postedDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT,
    "merchant" TEXT,
    "description" TEXT,
    "employee" TEXT,
    "reference" TEXT,
    "bankStatementId" TEXT NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReconciliationRun"
ADD COLUMN "bankStatementId" TEXT,
ADD COLUMN "bankSourceLabel" TEXT,
ADD COLUMN "bankSourceMode" TEXT;

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "sourceBankTransactionId" TEXT;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankStatementId_fkey"
FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_bankStatementId_fkey"
FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceBankTransactionId_fkey"
FOREIGN KEY ("sourceBankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
