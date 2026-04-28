-- AlterTable: add isClaimableOverride nullable boolean to Transaction, BankTransaction, and ManualExpense
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "isClaimableOverride" BOOLEAN;
ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "isClaimableOverride" BOOLEAN;
ALTER TABLE "ManualExpense" ADD COLUMN IF NOT EXISTS "isClaimableOverride" BOOLEAN;
