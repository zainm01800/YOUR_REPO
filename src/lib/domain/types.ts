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
  | "missing_gl_code"
  | "missing_vat_code"
  | "same_receipt_used_twice"
  | "gross_formula_break"
  | "currency_mismatch";

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
  | "glCode";

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
}

export interface ReconciliationRun {
  id: string;
  name: string;
  status: RunStatus;
  createdAt: string;
  processedAt?: string;
  entity?: string;
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
  source: string;
  supplier: string;
  date?: string;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  net?: number;
  vat?: number;
  gross?: number;
  vatPercent?: number;
  vatCode?: string;
  glCode?: string;
  matchStatus: MatchStatus;
  confidence: number;
  originalDescription: string;
  employee?: string;
  notes?: string;
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
    summary: RunProcessingSummary;
  }>;
  templates: MappingTemplate[];
  vatRules: VatRule[];
  glRules: GlCodeRule[];
}
