export type RunStatus =
  | "draft"
  | "awaiting_mapping"
  | "ready_to_process"
  | "processing"
  | "review_required"
  | "completed"
  | "exported"
  | "failed";

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

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  countryProfile: string;
  amountTolerance: number;
  dateToleranceDays: number;
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
  noReceiptRequired?: boolean;
  excludedFromExport?: boolean;
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
  | "originalValue"
  | "gross"
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
  /** Document amounts in document currency */
  net?: number;
  vat?: number;
  gross?: number;
  vatPercent?: number;
  /** Converted amounts in runCurrency (undefined if same currency or no FX rate available) */
  grossInRunCurrency?: number;
  netInRunCurrency?: number;
  vatInRunCurrency?: number;
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
}

export interface DashboardSnapshot {
  workspace: Workspace;
  user: User;
  runs: Array<{
    id: string;
    name: string;
    status: RunStatus;
    createdAt: string;
    processedAt?: string;
    entity?: string;
    period?: string;
    locked?: boolean;
    summary: RunProcessingSummary;
  }>;
  templates: MappingTemplate[];
  vatRules: VatRule[];
  glRules: GlCodeRule[];
}
