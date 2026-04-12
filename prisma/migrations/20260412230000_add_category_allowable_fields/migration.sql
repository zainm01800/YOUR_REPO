-- AddColumn: allowableForTax and allowablePercentage to CategoryRule
ALTER TABLE "CategoryRule" ADD COLUMN "allowableForTax" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CategoryRule" ADD COLUMN "allowablePercentage" DECIMAL(5,2) NOT NULL DEFAULT 100;
