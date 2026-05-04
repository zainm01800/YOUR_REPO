CREATE TABLE "TransactionComment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionSource" TEXT NOT NULL DEFAULT 'transaction',
    "body" TEXT NOT NULL,
    "requestType" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "TransactionComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewSubmission" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "period" TEXT,
    "note" TEXT,
    "readinessJson" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransactionComment_workspaceId_transactionId_createdAt_idx" ON "TransactionComment"("workspaceId", "transactionId", "createdAt" DESC);
CREATE INDEX "TransactionComment_authorId_idx" ON "TransactionComment"("authorId");
CREATE INDEX "ReviewSubmission_workspaceId_submittedAt_idx" ON "ReviewSubmission"("workspaceId", "submittedAt" DESC);
CREATE INDEX "ReviewSubmission_status_idx" ON "ReviewSubmission"("status");

ALTER TABLE "TransactionComment" ADD CONSTRAINT "TransactionComment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionComment" ADD CONSTRAINT "TransactionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
