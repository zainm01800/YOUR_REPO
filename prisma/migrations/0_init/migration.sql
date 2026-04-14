-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('draft', 'awaiting_mapping', 'ready_to_process', 'processing', 'review_required', 'completed', 'exported', 'failed');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('transaction_file', 'document', 'archive', 'derived_image', 'export_file');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('matched', 'probable_match', 'multiple_candidates', 'unmatched', 'duplicate_suspected');

-- CreateEnum
CREATE TYPE "ReviewActionType" AS ENUM ('approve', 'edit_field', 'rematch', 'override_vat_code', 'override_gl_code', 'no_receipt_required', 'exclude_from_export');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'GBP',
    "countryProfile" TEXT NOT NULL DEFAULT 'GB',
    "amountTolerance" DECIMAL(10,2) NOT NULL,
    "dateToleranceDays" INTEGER NOT NULL DEFAULT 5,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "businessType" TEXT NOT NULL DEFAULT 'sole_trader',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'draft',
    "entity" TEXT,
    "period" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "countryProfile" TEXT,
    "bankStatementId" TEXT,
    "bankSourceMode" TEXT,
    "bankSourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "transactionFileName" TEXT,
    "notes" TEXT,
    "fxRates" JSONB,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

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
    "vatCode" TEXT,
    "glCode" TEXT,
    "category" TEXT,
    "taxTreatment" TEXT,
    "taxRate" DECIMAL(5,2),
    "noReceiptRequired" BOOLEAN NOT NULL DEFAULT false,
    "excludedFromExport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileKind" "FileKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "sourceBankTransactionId" TEXT,
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
    "vatCode" TEXT,
    "glCode" TEXT,
    "category" TEXT,
    "taxTreatment" TEXT,
    "taxRate" DECIMAL(5,2),
    "noReceiptRequired" BOOLEAN NOT NULL DEFAULT false,
    "excludedFromExport" BOOLEAN NOT NULL DEFAULT false,
    "runId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "supplier" TEXT,
    "issueDate" TIMESTAMP(3),
    "gross" DECIMAL(12,2),
    "net" DECIMAL(12,2),
    "vat" DECIMAL(12,2),
    "vatRateSummary" TEXT,
    "documentNumber" TEXT,
    "countryCode" TEXT,
    "currency" TEXT,
    "rawExtractedText" TEXT,
    "extractionConfidence" DECIMAL(4,2),
    "duplicateFingerprint" TEXT,
    "runId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTaxLine" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "netAmount" DECIMAL(12,2),
    "taxAmount" DECIMAL(12,2),
    "grossAmount" DECIMAL(12,2),
    "rate" DECIMAL(5,2),
    "recoverable" BOOLEAN NOT NULL DEFAULT true,
    "vatCode" TEXT,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "DocumentTaxLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchDecision" (
    "id" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "rationale" JSONB NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionId" TEXT NOT NULL,
    "documentId" TEXT,
    "runId" TEXT NOT NULL,

    CONSTRAINT "MatchDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAction" (
    "id" TEXT NOT NULL,
    "actionType" "ReviewActionType" NOT NULL,
    "field" TEXT,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "transactionId" TEXT,
    "documentId" TEXT,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatRule" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "taxCode" TEXT NOT NULL,
    "recoverable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "VatRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlCodeRule" (
    "id" TEXT NOT NULL,
    "glCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "supplierPattern" TEXT,
    "keywordPattern" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "GlCodeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT NOT NULL DEFAULT 'Other & Special',
    "supplierPattern" TEXT,
    "keywordPattern" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "accountType" TEXT NOT NULL DEFAULT 'expense',
    "statementType" TEXT NOT NULL DEFAULT 'p_and_l',
    "reportingBucket" TEXT NOT NULL DEFAULT 'Other Expenses',
    "defaultTaxTreatment" TEXT NOT NULL DEFAULT 'standard_rated',
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "defaultVatRecoverable" BOOLEAN NOT NULL DEFAULT true,
    "glCode" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "allowableForTax" BOOLEAN NOT NULL DEFAULT true,
    "allowablePercentage" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 1000,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "CategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "columnMappings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "MappingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_workspaceId_createdAt_idx" ON "ReconciliationRun"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReconciliationRun_bankStatementId_idx" ON "ReconciliationRun"("bankStatementId");

-- CreateIndex
CREATE INDEX "BankStatement_workspaceId_importedAt_idx" ON "BankStatement"("workspaceId", "importedAt" DESC);

-- CreateIndex
CREATE INDEX "BankTransaction_bankStatementId_transactionDate_idx" ON "BankTransaction"("bankStatementId", "transactionDate");

-- CreateIndex
CREATE INDEX "BankTransaction_bankStatementId_postedDate_idx" ON "BankTransaction"("bankStatementId", "postedDate");

-- CreateIndex
CREATE INDEX "Transaction_runId_transactionDate_idx" ON "Transaction"("runId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_runId_postedDate_idx" ON "Transaction"("runId", "postedDate");

-- CreateIndex
CREATE INDEX "Transaction_sourceBankTransactionId_idx" ON "Transaction"("sourceBankTransactionId");

-- CreateIndex
CREATE INDEX "Document_runId_issueDate_idx" ON "Document"("runId", "issueDate");

-- CreateIndex
CREATE INDEX "MatchDecision_runId_transactionId_idx" ON "MatchDecision"("runId", "transactionId");

-- CreateIndex
CREATE INDEX "MatchDecision_documentId_idx" ON "MatchDecision"("documentId");

-- CreateIndex
CREATE INDEX "ReviewAction_runId_createdAt_idx" ON "ReviewAction"("runId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VatRule_workspaceId_taxCode_idx" ON "VatRule"("workspaceId", "taxCode");

-- CreateIndex
CREATE INDEX "GlCodeRule_workspaceId_priority_idx" ON "GlCodeRule"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "CategoryRule_workspaceId_priority_idx" ON "CategoryRule"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "CategoryRule_workspaceId_section_sortOrder_idx" ON "CategoryRule"("workspaceId", "section", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRule_workspaceId_slug_key" ON "CategoryRule"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "MappingTemplate_workspaceId_createdAt_idx" ON "MappingTemplate"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportHistory_runId_createdAt_idx" ON "ExportHistory"("runId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceBankTransactionId_fkey" FOREIGN KEY ("sourceBankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTaxLine" ADD CONSTRAINT "DocumentTaxLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecision" ADD CONSTRAINT "MatchDecision_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecision" ADD CONSTRAINT "MatchDecision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDecision" ADD CONSTRAINT "MatchDecision_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatRule" ADD CONSTRAINT "VatRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlCodeRule" ADD CONSTRAINT "GlCodeRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingTemplate" ADD CONSTRAINT "MappingTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

