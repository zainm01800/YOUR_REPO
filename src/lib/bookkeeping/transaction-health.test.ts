import assert from "node:assert/strict";
import test from "node:test";
import { buildDuplicateCounts, getDuplicateKey, getTransactionHealth } from "./transaction-health";
import type { CategoryRule, TransactionRecord } from "@/lib/domain/types";

function category(overrides: Partial<CategoryRule> = {}): CategoryRule {
  return {
    id: "cat_test",
    category: "Office Supplies",
    slug: "office-supplies",
    section: "Office & Admin",
    priority: 10,
    accountType: "expense",
    statementType: "p_and_l",
    reportingBucket: "Office costs",
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

function tx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: "tx_test",
    transactionDate: "2026-04-30",
    amount: -120,
    currency: "GBP",
    merchant: "Stationery Shop",
    description: "Office stationery",
    category: "Office Supplies",
    ...overrides,
  };
}

test("flags uncategorised transaction as needing review", () => {
  const health = getTransactionHealth(tx({ category: undefined }), [category()]);
  assert.equal(health.status, "needs_review");
  assert.equal(health.issues.some((issue) => issue.code === "needs_category"), true);
});

test("flags missing receipt for material expense without evidence", () => {
  const health = getTransactionHealth(tx({ amount: -80 }), [category()]);
  assert.equal(health.issues.some((issue) => issue.code === "missing_receipt"), true);
});

test("does not flag receipt when no receipt required", () => {
  const health = getTransactionHealth(tx({ amount: -80, noReceiptRequired: true }), [category()]);
  assert.equal(health.issues.some((issue) => issue.code === "missing_receipt"), false);
});

test("flags possible personal merchants", () => {
  const health = getTransactionHealth(
    tx({ merchant: "Netflix", description: "Netflix subscription" }),
    [category()],
  );
  assert.equal(health.issues.some((issue) => issue.code === "possible_personal"), true);
});

test("detects duplicate transaction keys", () => {
  const transactions = [
    tx({ id: "a", merchant: "Fuel", amount: -55 }),
    tx({ id: "b", merchant: "Fuel", amount: -55 }),
  ];
  const counts = buildDuplicateCounts(transactions);
  assert.equal(counts.get(getDuplicateKey(transactions[0])), 2);
});

test("flags VAT risk on non-claimable VAT-coded expense", () => {
  const health = getTransactionHealth(
    tx({ category: "Fines", vatCode: "GB_STD_20" }),
    [
      category({
        category: "Fines",
        slug: "fines",
        allowableForTax: false,
        defaultTaxTreatment: "standard_rated",
      }),
    ],
    { vatRegistered: true },
  );
  assert.equal(health.issues.some((issue) => issue.code === "vat_on_non_claimable"), true);
});
