export type RunStatus =
  | "draft"
  | "awaiting_mapping"
  | "ready_to_process"
  | "processing"
  | "review_required"
  | "completed"
  | "exported"
  | "failed";

export type BankStatementImportStatus =
  | "importing"
  | "imported"
  | "failed";

export type BankTransactionReconciliationStatus =
  | "unreconciled"
  | "suggested_match"
  | "matched"
  | "confirmed"
  | "partially_matched"
  | "excluded";

export type BankSourceMode =
  | "statement"
  | "all_unreconciled"
  | "skip"
  | "later";

export type MatchStatus =
  | "matched"
  | "probable_match"
  | "multiple_candidates"
  | "unmatched"
  | "duplicate_suspected";

export type ExceptionCode =
  | "missing_receipt"
  | "amount_mismatch"
  | "duplicate_receipt"
  | "low_confidence_extraction"
  | "suspicious_vat_rate"
  | "foreign_vat_not_claimable"
  | "missing_gl_code"
  | "missing_vat_code"
  | "same_receipt_used_twice"
  | "gross_formula_break"
  | "currency_mismatch"
  | "duplicate_transaction";

export type ReviewActionType =
  | "approve"
  | "edit_field"
  | "rematch"
  | "override_vat_code"
  | "override_gl_code"
  | "no_receipt_required"
  | "exclude_from_export";

export interface User {
  id: string;
  email: string;
  name: string;
}

/** The fundamental accounting classification of a category */
export type AccountType = "income" | "expense" | "asset" | "liability" | "equity";

/**
 * Which financial statement a category flows into:
 * - p_and_l          → Profit & Loss (income and expenses)
 * - balance_sheet    → Balance Sheet (assets, liabilities)
 * - equity_movement  → Owner's equity section (drawings, capital introduced)
 * - tax_control      → VAT/tax control account
 */
export type StatementType = "p_and_l" | "balance_sheet" | "equity_movement" | "tax_control";

/**
 * How VAT / tax is treated for transactions in this category.
 * Drives the net/tax split and whether input VAT is recoverable.
 */
export type TaxTreatment =
  | "standard_rated"    // e.g. 20% VAT applies
  | "reduced_rated"     // e.g. 5% reduced rate
  | "zero_rated"        // 0% VAT — VAT registered but rate is 0
  | "exempt"            // VAT exempt — no VAT charged or reclaimed
  | "outside_scope"     // Outside the scope of VAT (e.g. vehicle tax, wages)
  | "no_vat"            // Non-VAT registered business — ignore VAT entirely
  | "reverse_charge"    // EU/B2B reverse charge
  | "non_recoverable";  // Input VAT paid but not recoverable (e.g. business entertainment)

export type BusinessType = "sole_trader" | "general_small_business";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  countryProfile: string;
  amountTolerance: number;
  dateToleranceDays: number;
  /** Whether the business is VAT-registered. Drives tax split logic in bookkeeping. */
  vatRegistered: boolean;
  /** Lightweight tax mode used by the Tax Summary feature. */
  businessType: BusinessType;
}

export interface CountryOption {
  code: string;
  label: string;
  currency: string;
}

export interface RunSetupPreset {
  id: string;
  name: string;
  entity?: string;
  countryProfile: string;
  defaultCurrency: string;
  templateId?: string;
  notes?: string;
}

export interface MappingTemplate {
  id: string;
  name: string;
  sourceType: string;
  columnMappings: Record<string, string>;
}

export interface VatRule {
  id: string;
  countryCode: string;
  rate: number;
  taxCode: string;
  recoverable: boolean;
  description: string;
}

export interface GlCodeRule {
  id: string;
  glCode: string;
  label: string;
  supplierPattern?: string;
  keywordPattern?: string;
  priority: number;
}

export interface UploadedFileMeta {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileKind: "transaction_file" | "document" | "archive" | "export_file";
}

export interface TransactionRecord {
  id: string;
  sourceBankTransactionId?: string;
  bankStatementId?: string;
  bankStatementName?: string;
  externalId?: string;
  sourceLineNumber?: number;
  transactionDate?: string;
  postedDate?: string;
  amount: number;
  currency: string;
  merchant: string;
  description: string;
  employee?: string;
  reference?: string;
  costCentre?: string;
  department?: string;
  vatCode?: string;
  glCode?: string;
  /** User-assigned bookkeeping category, e.g. "Transport", "Lesson Income" */
  category?: string;
  /** Manual override for VAT/tax treatment (overrides category default) */
  taxTreatment?: TaxTreatment;
  /** Manual override for VAT rate (overrides category default) */
  taxRate?: number;
  noReceiptRequired?: boolean;
  excludedFromExport?: boolean;
}

export interface BankTransaction extends TransactionRecord {
  bankStatementId: string;
  reconciliationStatus: BankTransactionReconciliationStatus;
  matchedRunId?: string;
  matchedRunName?: string;
}

export interface BankStatement {
  id: string;
  name: string;
  fileName: string;
  bankName?: string;
  accountName?: string;
  currency: string;
  importedAt: string;
  importStatus: BankStatementImportStatus;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  transactionCount: number;
  previewHeaders?: string[];
  savedColumnMappings?: Record<string, string>;
  transactions: BankTransaction[];
}

export interface BankStatementSummary {
  id: string;
  name: string;
  fileName: string;
  bankName?: string;
  accountName?: string;
  currency: string;
  importedAt: string;
  importStatus: BankStatementImportStatus;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  transactionCount: number;
}

/**
 * A bookkeeping category with full accounting metadata.
 * Also carries optional pattern-matching rules for auto-assigning
 * incoming transactions (supplier regex, keyword regex).
 */
export interface CategoryRule {
  id: string;
  /** Display name of this category, e.g. "Fuel", "Lesson Income" */
  category: string;
  /** Regex pattern matched against merchant/supplier name (case-insensitive) */
  supplierPattern?: string;
  /** Regex pattern matched against transaction description (case-insensitive) */
  keywordPattern?: string;
  priority: number;

  // ── Accounting metadata ──────────────────────────────────────────────────
  /** Fundamental accounting type: income, expense, asset, liability, equity */
  accountType: AccountType;
  /** Which financial statement this flows into */
  statementType: StatementType;
  /** Sub-grouping within the statement, e.g. "Motor Expenses", "Fixed Assets" */
  reportingBucket: string;
  /** Default VAT/tax treatment for transactions in this category */
  defaultTaxTreatment: TaxTreatment;
  /** Default VAT rate as a percentage, e.g. 20, 5, 0 */
  defaultVatRate: number;
  /** Whether input VAT on purchases in this category is recoverable */
  defaultVatRecoverable: boolean;
  /** Optional nominal/GL code to associate with this category */
  glCode?: string;
  /** Whether this category is currently active */
  isActive: boolean;

  // ── Tax allowability (HMRC / self-assessment logic) ──────────────────────
  /**
   * Whether expenses in this category are allowable for tax purposes.
   * Allowable expenses reduce taxable profit. Non-allowable expenses appear
   * in the P&L but are added back in the tax calculation.
   * Defaults to true. Only meaningful for accountType = "expense".
   */
  allowableForTax: boolean;
  /**
   * What percentage of the expense is allowable (0–100). Used for partial
   * allowances (e.g. 50% private use). Default 100.
   */
  allowablePercentage: number;
}

export interface DocumentTaxLine {
  id: string;
  label: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  rate: number;
  recoverable: boolean;
  vatCode?: string;
}

export interface ExtractedDocument {
  id: string;
  fileName: string;
  supplier?: string;
  issueDate?: string;
  gross?: number;
  net?: number;
  vat?: number;
  vatRateSummary?: string;
  documentNumber?: string;
  /** Supplier VAT registration number extracted from the invoice */
  vatNumber?: string;
  countryCode?: string;
  currency?: string;
  rawExtractedText?: string;
  confidence: number;
  duplicateFingerprint?: string;
  taxLines: DocumentTaxLine[];
}

export interface ClientExtractedDocumentInput {
  fileName: string;
  mimeType: string;
  rawExtractedText: string;
  source: "browser_tesseract";
  confidence?: number;
}

export interface MatchRationale {
  amountScore: number;
  dateScore: number;
  supplierScore: number;
  filenameScore: number;
  employeeScore: number;
  currencyScore: number;
  invoiceNumberScore: number;
  referenceScore: number;
  notes: string[];
}

export interface MatchDecision {
  id: string;
  transactionId: string;
  documentId?: string;
  status: MatchStatus;
  score: number;
  rationale: MatchRationale;
  selected: boolean;
}

export interface ReviewAction {
  id: string;
  runId: string;
  actionType: ReviewActionType;
  field?: string;
  beforeValue?: string;
  afterValue?: string;
  note?: string;
  createdAt: string;
  actorName: string;
}

export interface ExportRecord {
  id: string;
  format: "csv" | "xlsx";
  fileName: string;
  createdAt: string;
}

export type ExportColumnKey =
  | "source"
  | "supplier"
  | "date"
  | "currency"
  | "net"
  | "vat"
  | "gross"
  | "vatPercent"
  | "vatCode"
  | "glCode"
  | "matchStatus"
  | "originalDescription"
  | "employee"
  | "notes";

export interface ExportColumnLayout {
  key: ExportColumnKey;
  label: string;
  visible: boolean;
  width?: number;
}

export type ReviewBaseColumnKey =
  | "supplier"
  | "bankStatement"
  | "bankAmount"
  | "originalValue"
  | "gross"
  | "difference"
  | "grossMatch"
  | "net"
  | "vat"
  | "vatPercent"
  | "vatCode"
  | "glCode"
  | "date"
  | "reference"
  | "description"
  | "employee"
  | "source"
  | "matchStatus"
  | "currency"
  | "confidence"
  | "costCentre"
  | "department"
  | "invoiceNumber"
  | "vatNumber"
  | "approvalStatus";

export type ReviewGridColumnKey = ReviewBaseColumnKey | `custom_${string}`;

export interface ReviewGridColumnLayout {
  key: ReviewGridColumnKey;
  label: string;
  visible: boolean;
  width?: number;
  kind?: "base" | "custom";
  formula?: string;
}

export interface ReviewTableTemplate {
  id: string;
  name: string;
  columns: ReviewGridColumnLayout[];
  locked?: boolean;
}

export interface RunProcessingSummary {
  transactions: number;
  documents: number;
  matched: number;
  probable: number;
  multipleCandidates: number;
  unmatched: number;
  duplicates: number;
  exceptions: number;
  totalGross: number;
  totalNet: number;
  totalVat: number;
  totalVatClaimable: number;
  matchRatePct: number;
}

export interface RunListItem {
  id: string;
  name: string;
  status: RunStatus;
  createdAt: string;
  processedAt?: string;
  entity?: string;
  period?: string;
  locked?: boolean;
  summary: RunProcessingSummary;
}

export interface ReconciliationRun {
  id: string;
  name: string;
  status: RunStatus;
  createdAt: string;
  processedAt?: string;
  entity?: string;
  /** Accounting period this run covers, e.g. "2025-03" */
  period?: string;
  /** Whether this run has been locked (signed off) */
  locked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  countryProfile?: string;
  defaultCurrency?: string;
  bankStatementId?: string;
  bankSourceMode?: BankSourceMode;
  bankSourceLabel?: string;
  transactionFileName?: string;
  previewHeaders?: string[];
  savedColumnMappings?: Record<string, string>;
  uploadedFiles: UploadedFileMeta[];
  transactions: TransactionRecord[];
  documents: ExtractedDocument[];
  matches: MatchDecision[];
  auditTrail: ReviewAction[];
  exports: ExportRecord[];
  /** Exchange rates fetched at processing time: base = defaultCurrency, values = units per 1 base */
  fxRates?: Record<string, number>;
}

export interface RunRowException {
  code: ExceptionCode;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface ReviewRow {
  id: string;
  transactionId: string;
  sourceBankTransactionId?: string;
  bankStatementName?: string;
  documentId?: string;
  taxLineId?: string;
  taxLineLabel?: string;
  source: string;
  supplier: string;
  date?: string;
  /** Currency of the source document/invoice */
  currency: string;
  /** Run's default currency (home currency) */
  runCurrency: string;
  /** Original transaction amount in originalCurrency */
  originalAmount: number;
  originalCurrency: string;
  bankTransactionAmount: number;
  /** Document amounts in document currency */
  net?: number;
  vat?: number;
  gross?: number;
  vatPercent?: number;
  /** Converted amounts in runCurrency (undefined if same currency or no FX rate available) */
  grossInRunCurrency?: number;
  netInRunCurrency?: number;
  vatInRunCurrency?: number;
  grossDifference?: number;
  grossComparisonStatus?: "exact" | "close" | "mismatch" | "missing_document";
  /** FX rate used: how many document-currency units per 1 run-currency unit */
  fxRate?: number;
  vatCode?: string;
  glCode?: string;
  reference?: string;
  costCentre?: string;
  department?: string;
  invoiceNumber?: string;
  vatNumber?: string;
  matchStatus: MatchStatus;
  confidence: number;
  originalDescription: string;
  employee?: string;
  notes?: string;
  /** Preparer has submitted, reviewer has approved, approver has signed off */
  approvalStatus?: "draft" | "submitted" | "reviewed" | "approved";
  approved: boolean;
  excludedFromExport: boolean;
  exceptions: RunRowException[];
  /** Bookkeeping category derived from transaction or category rules */
  category?: string;
  /** Effective tax treatment (from transaction override or category default) */
  taxTreatment?: TaxTreatment;
  /** Account type from the matched category (income / expense / asset / …) */
  accountType?: AccountType;
  /** Financial statement type from the matched category */
  statementType?: StatementType;
  /** Reporting bucket from the matched category, e.g. "Motor Expenses" */
  reportingBucket?: string;
}

export interface DashboardSnapshot {
  workspace: Workspace;
  user: User;
  runs: RunListItem[];
  templates: MappingTemplate[];
  vatRules: VatRule[];
  glRules: GlCodeRule[];
  categoryRules: CategoryRule[];
}

export interface SettingsSnapshot {
  workspace: Workspace;
  templates: MappingTemplate[];
  vatRules: VatRule[];
  glRules: GlCodeRule[];
  categoryRules: CategoryRule[];
}
