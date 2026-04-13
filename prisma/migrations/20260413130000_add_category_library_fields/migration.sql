ALTER TABLE "CategoryRule"
ADD COLUMN "slug" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "section" TEXT NOT NULL DEFAULT 'Other & Special',
ADD COLUMN "isSystemDefault" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 1000;

UPDATE "CategoryRule"
SET "slug" = TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("category"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

UPDATE "CategoryRule"
SET "slug" = CONCAT('category-', "id")
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "CategoryRule"
SET "isVisible" = "isActive"
WHERE "isVisible" IS DISTINCT FROM "isActive";

UPDATE "CategoryRule"
SET "sortOrder" = "priority"
WHERE "sortOrder" = 1000;

ALTER TABLE "CategoryRule"
ALTER COLUMN "slug" SET NOT NULL;

CREATE INDEX "CategoryRule_workspaceId_section_sortOrder_idx"
ON "CategoryRule"("workspaceId", "section", "sortOrder");

CREATE UNIQUE INDEX "CategoryRule_workspaceId_slug_key"
ON "CategoryRule"("workspaceId", "slug");
