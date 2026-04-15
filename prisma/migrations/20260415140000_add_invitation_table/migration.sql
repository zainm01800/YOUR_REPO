-- Create InvitationStatus enum
DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Invitation table
CREATE TABLE IF NOT EXISTS "Invitation" (
    "id"          TEXT         NOT NULL,
    "email"       TEXT         NOT NULL,
    "role"        TEXT         NOT NULL DEFAULT 'viewer',
    "token"       TEXT         NOT NULL,
    "status"      "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "acceptedAt"  TIMESTAMP(3),
    "workspaceId" TEXT         NOT NULL,
    "invitedById" TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Unique token
CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_token_key" ON "Invitation"("token");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "Invitation_workspaceId_idx" ON "Invitation"("workspaceId");
CREATE INDEX IF NOT EXISTS "Invitation_email_idx" ON "Invitation"("email");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Invitation"
    ADD CONSTRAINT "Invitation_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Invitation"
    ADD CONSTRAINT "Invitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Enable RLS immediately
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
