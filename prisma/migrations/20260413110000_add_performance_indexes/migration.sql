CREATE INDEX IF NOT EXISTS "ReconciliationRun_workspaceId_createdAt_idx"
ON "ReconciliationRun" ("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ReconciliationRun_bankStatementId_idx"
ON "ReconciliationRun" ("bankStatementId");

CREATE INDEX IF NOT EXISTS "BankStatement_workspaceId_importedAt_idx"
ON "BankStatement" ("workspaceId", "importedAt" DESC);

CREATE INDEX IF NOT EXISTS "BankTransaction_bankStatementId_transactionDate_idx"
ON "BankTransaction" ("bankStatementId", "transactionDate");

CREATE INDEX IF NOT EXISTS "BankTransaction_bankStatementId_postedDate_idx"
ON "BankTransaction" ("bankStatementId", "postedDate");

CREATE INDEX IF NOT EXISTS "Transaction_runId_transactionDate_idx"
ON "Transaction" ("runId", "transactionDate");

CREATE INDEX IF NOT EXISTS "Transaction_runId_postedDate_idx"
ON "Transaction" ("runId", "postedDate");

CREATE INDEX IF NOT EXISTS "Transaction_sourceBankTransactionId_idx"
ON "Transaction" ("sourceBankTransactionId");

CREATE INDEX IF NOT EXISTS "Document_runId_issueDate_idx"
ON "Document" ("runId", "issueDate");

CREATE INDEX IF NOT EXISTS "MatchDecision_runId_transactionId_idx"
ON "MatchDecision" ("runId", "transactionId");

CREATE INDEX IF NOT EXISTS "MatchDecision_documentId_idx"
ON "MatchDecision" ("documentId");

CREATE INDEX IF NOT EXISTS "ReviewAction_runId_createdAt_idx"
ON "ReviewAction" ("runId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "VatRule_workspaceId_taxCode_idx"
ON "VatRule" ("workspaceId", "taxCode");

CREATE INDEX IF NOT EXISTS "GlCodeRule_workspaceId_priority_idx"
ON "GlCodeRule" ("workspaceId", "priority");

CREATE INDEX IF NOT EXISTS "CategoryRule_workspaceId_priority_idx"
ON "CategoryRule" ("workspaceId", "priority");

CREATE INDEX IF NOT EXISTS "MappingTemplate_workspaceId_createdAt_idx"
ON "MappingTemplate" ("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "ExportHistory_runId_createdAt_idx"
ON "ExportHistory" ("runId", "createdAt" DESC);
