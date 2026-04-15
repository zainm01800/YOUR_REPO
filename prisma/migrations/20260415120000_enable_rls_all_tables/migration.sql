-- Enable Row-Level Security on all public tables.
--
-- Context: This app connects to Supabase via Prisma using the direct database
-- connection string (postgres role), which bypasses RLS. Enabling RLS here
-- has no effect on the application — it only blocks unauthenticated access via
-- Supabase's REST API / anon key, which should never touch these tables directly.
--
-- Without RLS enabled, anyone who discovers the project URL and anon key could
-- read, insert, update, or delete all rows via the PostgREST REST API.

ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReconciliationRun"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankStatement"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankTransaction"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadedFile"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentTaxLine"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchDecision"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewAction"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VatRule"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GlCodeRule"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryRule"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MappingTemplate"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExportHistory"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation"         ENABLE ROW LEVEL SECURITY;
