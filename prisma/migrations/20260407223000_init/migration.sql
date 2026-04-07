CREATE TYPE "RunStatus" AS ENUM ('draft', 'awaiting_mapping', 'ready_to_process', 'processing', 'review_required', 'completed', 'exported', 'failed');
CREATE TYPE "FileKind" AS ENUM ('transaction_file', 'document', 'archive', 'derived_image', 'export_file');
CREATE TYPE "MatchStatus" AS ENUM ('matched', 'probable_match', 'multiple_candidates', 'unmatched', 'duplicate_suspected');
CREATE TYPE "ReviewActionType" AS ENUM ('approve', 'edit_field', 'rematch', 'override_vat_code', 'override_gl_code', 'no_receipt_required', 'exclude_from_export');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Workspace" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'GBP',
  "countryProfile" TEXT NOT NULL DEFAULT 'GB',
  "amountTolerance" DECIMAL(10, 2) NOT NULL,
  "dateToleranceDays" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Membership" (
  "id" TEXT PRIMARY KEY,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "workspaceId")
);

CREATE TABLE "ReconciliationRun" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" "RunStatus" NOT NULL DEFAULT 'draft',
  "entity" TEXT,
  "countryProfile" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "transactionFileName" TEXT,
  "notes" TEXT
);

CREATE TABLE "UploadedFile" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileKind" "FileKind" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE
);

CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY,
  "externalId" TEXT,
  "sourceLineNumber" INTEGER,
  "transactionDate" TIMESTAMP,
  "postedDate" TIMESTAMP,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT,
  "merchant" TEXT,
  "description" TEXT,
  "employee" TEXT,
  "reference" TEXT,
  "vatCode" TEXT,
  "glCode" TEXT,
  "noReceiptRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "excludedFromExport" BOOLEAN NOT NULL DEFAULT FALSE,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE
);

CREATE TABLE "Document" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "supplier" TEXT,
  "issueDate" TIMESTAMP,
  "gross" DECIMAL(12, 2),
  "net" DECIMAL(12, 2),
  "vat" DECIMAL(12, 2),
  "vatRateSummary" TEXT,
  "documentNumber" TEXT,
  "countryCode" TEXT,
  "currency" TEXT,
  "rawExtractedText" TEXT,
  "extractionConfidence" DECIMAL(4, 2),
  "duplicateFingerprint" TEXT,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE
);

CREATE TABLE "DocumentTaxLine" (
  "id" TEXT PRIMARY KEY,
  "label" TEXT,
  "netAmount" DECIMAL(12, 2),
  "taxAmount" DECIMAL(12, 2),
  "grossAmount" DECIMAL(12, 2),
  "rate" DECIMAL(5, 2),
  "recoverable" BOOLEAN NOT NULL DEFAULT TRUE,
  "vatCode" TEXT,
  "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE
);

CREATE TABLE "MatchDecision" (
  "id" TEXT PRIMARY KEY,
  "status" "MatchStatus" NOT NULL,
  "score" DECIMAL(5, 2) NOT NULL,
  "rationale" JSONB NOT NULL,
  "selected" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transactionId" TEXT NOT NULL REFERENCES "Transaction"("id") ON DELETE CASCADE,
  "documentId" TEXT REFERENCES "Document"("id") ON DELETE SET NULL,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE
);

CREATE TABLE "ReviewAction" (
  "id" TEXT PRIMARY KEY,
  "actionType" "ReviewActionType" NOT NULL,
  "field" TEXT,
  "beforeValue" TEXT,
  "afterValue" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE,
  "transactionId" TEXT,
  "documentId" TEXT,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "VatRule" (
  "id" TEXT PRIMARY KEY,
  "countryCode" TEXT NOT NULL,
  "rate" DECIMAL(5, 2) NOT NULL,
  "taxCode" TEXT NOT NULL,
  "recoverable" BOOLEAN NOT NULL DEFAULT TRUE,
  "description" TEXT,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE
);

CREATE TABLE "GlCodeRule" (
  "id" TEXT PRIMARY KEY,
  "glCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "supplierPattern" TEXT,
  "keywordPattern" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE
);

CREATE TABLE "MappingTemplate" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "columnMappings" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE
);

CREATE TABLE "ExportHistory" (
  "id" TEXT PRIMARY KEY,
  "format" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "runId" TEXT NOT NULL REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);
