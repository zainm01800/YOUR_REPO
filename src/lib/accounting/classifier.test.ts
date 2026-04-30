import assert from "node:assert/strict";
import test from "node:test";
import { computeTaxAmounts, classifyTransaction } from "./classifier";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";

function category(overrides: Partial<CategoryRule> = {}): CategoryRule {
  return {
    id: "cat_test",
    category: "Fuel",
    slug: "fuel",
    section: "Travel & Vehicle",
    priority: 10,
    accountType: "expense",
    statementType: "p_and_l",
    reportingBucket: "Motor costs",
    defaultTaxTreatment: "standard_rated",
    defaultVatRate: 20,
    defaultVatRecoverable: true,
    isSystemDefault: true,
    isActive: true,
    isVisible: true,
    allowableForTax: true,
    allowablePercentage: 100,
    sortOrder: 1,
    ...overrides,
  };
}

function transaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: "tx_test",
    amount: -120,
    currency: "GBP",
    merchant: "Fuel Station",
    description: "Fuel",
    ...overrides,
  };
}

test("VAT registered standard-rated gross splits into net and VAT", () => {
  const result = computeTaxAmounts(-120, "standard_rated", 20, true);
  assert.equal(result.netAmount, -100);
  assert.equal(result.taxAmount, -20);
  assert.equal(result.vatRecoverable, true);
});

test("non-VAT registered business ignores VAT split", () => {
  const result = computeTaxAmounts(-120, "standard_rated", 20, false);
  assert.equal(result.netAmount, -120);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.vatRecoverable, false);
});

test("non-claimable expense creates tax add-back", () => {
  const classified = classifyTransaction(
    transaction({ amount: -60 }),
    category({ allowableForTax: false, defaultTaxTreatment: "outside_scope", defaultVatRate: 0 }),
    true,
  );
  assert.equal(classified.accountType, "expense");
  assert.equal(classified.allowableAmount, 0);
  assert.equal(classified.disallowedAmount, 60);
});

test("asset purchase does not flow through as an expense", () => {
  const classified = classifyTransaction(
    transaction({ amount: -12000, merchant: "Car Dealer" }),
    category({
      category: "Vehicle Purchase",
      slug: "vehicle-purchase",
      accountType: "asset",
      statementType: "balance_sheet",
      reportingBucket: "Fixed assets",
      allowableForTax: false,
    }),
    true,
  );
  assert.equal(classified.accountType, "asset");
  assert.equal(classified.statementType, "balance_sheet");
  assert.equal(classified.supportsAllowability, false);
});
