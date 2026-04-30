# Zentra product and accounting audit

This file tracks what is implemented, partially implemented, and still missing before Zentra is safe to treat as a public-ready sole trader / small-business accounting product.

## Current implementation snapshot

- Implemented: bank statement import, central bank transactions, transaction categories, category accounting metadata, tax/VAT treatments, expenses, mileage, invoices, clients, OCR extraction, reconciliation runs, review workspace, VAT summary, tax summary, P&L / balance sheet style reports, period export pack, workspace roles, owner override, accountant/business views, category visibility, review queue, missing receipts report.
- Partially implemented: receipt-to-bank matching, audit trail, period locking, VAT country logic, accountant workflow, AI review guidance, mobile UX, public-ready data/document governance.
- Missing or weak: per-transaction document attachment outside reconciliation runs, client/accountant comments, immutable audit log for every manual override, background OCR jobs, comprehensive tests, MTD-ready quarterly period workflows, export backup by workspace, explicit data retention/privacy controls.

## Gap analysis and TODOs

### 1. Sole trader user experience

- Status: partially implemented.
- Exists: `/dashboard`, `/bookkeeping/tax-summary`, `/expenses`, `/mileage`, simplified business-user navigation.
- Weakness: dashboard does not yet show true cash position from bank balances; it shows imported activity totals.
- TODO: add cash position once bank account opening/closing balances are stored.
- Files: `src/lib/domain/types.ts`, `prisma/schema.prisma`, `src/app/(app)/bank-statements/import/page.tsx`, `src/app/(app)/dashboard/page.tsx`.

### 2. Transaction workflow

- Status: partially implemented.
- Exists: bank import, paginated transactions, categorisation, allowability metadata, duplicate detection, review queue, missing receipt detection, category override action.
- Weakness: business/private split is inferred through categories only; there is no first-class `business_use_percent` field.
- TODO: add `businessUsePercent`, `personalPortion`, and audit-backed override reason.
- Files: `prisma/schema.prisma`, `src/lib/domain/types.ts`, `src/app/actions/bookkeeping.ts`, `src/components/bookkeeping/transactions-table.tsx`.

### 3. Receipt/OCR workflow

- Status: partially implemented.
- Exists: OCR extraction, review rows, match status/confidence fields, gross comparison.
- Weakness: receipts cannot yet be attached directly to a central bank transaction outside a reconciliation run.
- TODO: create `TransactionDocumentAttachment` or reuse `MatchDecision` against central `BankTransaction`.
- Files: `prisma/schema.prisma`, `src/app/api/bookkeeping/transactions/[transactionId]/attachments`, `src/components/review/document-attachment-panel.tsx`, `src/lib/reconciliation`.

### 4. VAT logic

- Status: partially implemented.
- Exists: VAT rates/treatments, VAT summary, VAT reconciliation, country rate library, VAT sync.
- Weakness: VAT warnings are mostly UI/review based; country mismatch and VAT number validation are not consistently applied to central transactions.
- TODO: add deterministic VAT validation engine.
- Files: `src/lib/vat/validation.ts`, `src/lib/bookkeeping/transaction-health.ts`, `src/components/bookkeeping/vat-reconciliation.tsx`.

### 5. Sole trader tax logic

- Status: partially implemented.
- Exists: accounting profit, taxable profit, add-backs, income tax/NI estimate, disclaimer copy.
- Weakness: UK estimate is simplified and not yet configurable for other tax jurisdictions or special cases.
- TODO: move UK tax bands into versioned settings and add tax-year selector.
- Files: `src/lib/accounting/tax-summary.ts`, `src/app/(app)/bookkeeping/tax-summary/page.tsx`.

### 6. Accounting logic

- Status: mostly implemented for lightweight reporting.
- Exists: category metadata for P&L, balance sheet, equity, VAT/tax, reporting buckets.
- Weakness: no hidden double-entry journal table yet; reports are transaction-classification based.
- TODO: add optional generated journal entries for accountant/admin mode.
- Files: `prisma/schema.prisma`, `src/lib/accounting/journal.ts`, `src/app/(app)/bookkeeping/reports/page.tsx`.

### 7. Accountant mode

- Status: partially implemented.
- Exists: owner/accountant view, advanced pages, review queue, period locks in run flow, exports.
- Weakness: transaction-level comments, sign-off, and override reasons are not first-class.
- TODO: add accountant notes/tasks per transaction and per period.
- Files: `prisma/schema.prisma`, `src/app/(app)/bookkeeping/review-queue/page.tsx`, `src/components/bookkeeping/transactions-table.tsx`.

### 8. AI assistant / smart guidance

- Status: partially implemented.
- Exists: AI endpoints and deterministic smart flags for personal-looking, duplicate, missing receipt, VAT-risk, large-spend issues.
- Weakness: no consolidated AI review report with approval workflow yet.
- TODO: add `AI Review` page that proposes changes but requires approval.
- Files: `src/app/api/ai/categorise-transactions/route.ts`, `src/app/(app)/bookkeeping/review-queue/page.tsx`, `src/lib/bookkeeping/transaction-health.ts`.

### 9. Public-ready product concerns

- Status: partially implemented.
- Exists: Clerk auth, workspaces, roles, secure Blob dependency, export pack.
- Weakness: data retention, privacy policy UI, backup/export-all, and production observability are not complete.
- TODO: add workspace backup export, retention settings, and audit event viewer.
- Files: `src/app/(app)/settings/page.tsx`, `src/app/api/export/workspace-backup`, `prisma/schema.prisma`.

### 10. UI/UX improvements

- Status: ongoing.
- Exists: cleaner navigation, dashboard readiness, reports, review queue, responsive layouts on many pages.
- Weakness: several older pages still use long tables and need mobile-card alternatives.
- TODO: mobile-card views for reconciliation review, bank statement detail, and reports.
- Files: `src/components/review/review-workspace.tsx`, `src/components/bank-statements/*`, `src/components/bookkeeping/financial-reports.tsx`.

### 11. Reports

- Status: partially implemented.
- Exists: dashboard, P&L, balance sheet, VAT, tax summary, transactions CSV, missing receipts, review queue, period pack.
- Weakness: reports do not yet have signed-off/final vs draft distinction.
- TODO: add report state: draft, reviewed, locked.
- Files: `prisma/schema.prisma`, `src/lib/export/period-export.ts`, `src/app/(app)/export/period-pack/page.tsx`.

### 12. Safety and accuracy

- Status: weak but improving.
- Exists: disclaimers and deterministic validation in review queue.
- Weakness: no dedicated test runner before this audit; no broad accounting test suite.
- TODO: expand tests around receipt matching, VAT validation, tax estimates, refunds, credits, and export totals.
- Files: `src/lib/**/*.test.ts`, `package.json`.
