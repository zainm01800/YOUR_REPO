import { hashSync } from "bcryptjs";
import { Prisma, type PrismaClient } from "@prisma/client";
import { appConfig } from "@/lib/config";
import {
  cloneBankTransactionsForRun,
  decorateBankStatementsWithStatuses,
  deriveStatementMetadata,
  pickTransactionsForBankSource,
} from "@/lib/bank-statements/service";
import { demoStore } from "@/lib/demo/demo-store";
import { mergeWorkspaceCategoryRules } from "@/lib/accounting/default-categories";
import { resolveUserWorkspace } from "./multi-tenancy";
import { getPrismaClient } from "./prisma";
import { applyReviewMutationToRun } from "./review-mutation";
import type {
  AttachBankSourceInput,
  CreateRunInput,
  ImportBankStatementInput,
  ReplaceCategoryRulesInput,
  Repository,
  ReviewMutationInput,
  ReviewMutationResult,
  UpdateWorkspaceInput,
  UpsertGlCodeRulesInput,
  UpsertVatRulesInput,
} from "@/lib/data/repository";
import type {
  BankStatement,
  BankStatementSummary,
  BankTransaction,
  CategoryRule,
  DashboardSnapshot,
  ExportRecord,
  ExtractedDocument,
  GlCodeRule,
  MappingTemplate,
  MatchDecision,
  ReconciliationRun,
  ReviewAction,
  ReviewRow,
  RunListItem,
  SettingsSnapshot,
  TaxTreatment,
  TransactionRecord,
  UploadedFileMeta,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

const detailedRunInclude = {
  workspace: true,
  bankStatement: true,
  uploadedFiles: true,
  transactions: {
    select: {
      id: true,
      sourceBankTransactionId: true,
      externalId: true,
      sourceLineNumber: true,
      transactionDate: true,
      postedDate: true,
      amount: true,
      currency: true,
      merchant: true,
      description: true,
      employee: true,
      reference: true,
      vatCode: true,
      glCode: true,
      category: true,
      taxTreatment: true,
      taxRate: true,
      noReceiptRequired: true,
      excludedFromExport: true,
      sourceBankTransaction: {
        select: {
          id: true,
          bankStatementId: true,
          bankStatement: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  documents: { include: { taxLines: true } },
  matches: true,
  reviewActions: { include: { actor: true } },
  exports: { include: { actor: true } },
} satisfies Prisma.ReconciliationRunInclude;

const summaryRunInclude = {
  workspace: true,
  bankStatement: true,
  transactions: {
    select: {
      id: true,
      sourceBankTransactionId: true,
      externalId: true,
      sourceLineNumber: true,
      transactionDate: true,
      postedDate: true,
      amount: true,
      currency: true,
      merchant: true,
      description: true,
      employee: true,
      reference: true,
      vatCode: true,
      glCode: true,
      category: true,
      taxTreatment: true,
      taxRate: true,
      noReceiptRequired: true,
      excludedFromExport: true,
      sourceBankTransaction: {
        select: {
          id: true,
          bankStatementId: true,
          bankStatement: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  documents: { include: { taxLines: true } },
  matches: true,
} satisfies Prisma.ReconciliationRunInclude;

// Lean include for the bookkeeping/transactions page — only pulls tx fields, no documents or matches
const transactionOnlyRunInclude = {
  transactions: {
    select: {
      id: true,
      sourceBankTransactionId: true,
      externalId: true,
      sourceLineNumber: true,
      transactionDate: true,
      postedDate: true,
      amount: true,
      currency: true,
      merchant: true,
      description: true,
      employee: true,
      reference: true,
      vatCode: true,
      glCode: true,
      category: true,
      taxTreatment: true,
      taxRate: true,
      noReceiptRequired: true,
      excludedFromExport: true,
      sourceBankTransaction: {
        select: { id: true, bankStatementId: true, bankStatement: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ReconciliationRunInclude;

type DbTransactionOnlyRun = Prisma.ReconciliationRunGetPayload<{ include: typeof transactionOnlyRunInclude }>;

const bankStatusRunInclude = {
  transactions: {
    select: {
      id: true,
      excludedFromExport: true,
      sourceBankTransactionId: true,
    },
  },
  matches: {
    select: {
      id: true,
      documentId: true,
      selected: true,
      status: true,
      transactionId: true,
    },
  },
} satisfies Prisma.ReconciliationRunInclude;

type DbDetailedRun = Prisma.ReconciliationRunGetPayload<{ include: typeof detailedRunInclude }>;
type DbSummaryRun = Prisma.ReconciliationRunGetPayload<{ include: typeof summaryRunInclude }>;
type DbBankStatusRun = Prisma.ReconciliationRunGetPayload<{ include: typeof bankStatusRunInclude }>;

const invitationInclude = {
  invitedBy: true,
  workspace: true,
} satisfies Prisma.InvitationInclude;

const bankStatementInclude = {
  transactions: {
    select: {
      id: true,
      bankStatementId: true,
      externalId: true,
      sourceLineNumber: true,
      transactionDate: true,
      postedDate: true,
      amount: true,
      currency: true,
      merchant: true,
      description: true,
      employee: true,
      reference: true,
      vatCode: true,
      glCode: true,
      category: true,
      taxTreatment: true,
      taxRate: true,
      noReceiptRequired: true,
      excludedFromExport: true,
    },
  },
} satisfies Prisma.BankStatementInclude;

type DbBankStatement = Prisma.BankStatementGetPayload<{ include: typeof bankStatementInclude }>;

const bankStatementSummarySelect = {
  id: true,
  name: true,
  fileName: true,
  bankName: true,
  accountName: true,
  currency: true,
  importedAt: true,
  importStatus: true,
  dateRangeStart: true,
  dateRangeEnd: true,
  _count: {
    select: {
      transactions: true,
    },
  },
} satisfies Prisma.BankStatementSelect;

type DbBankStatementSummary = Prisma.BankStatementGetPayload<{ select: typeof bankStatementSummarySelect }>;

const unassignedBankTransactionSelect = {
  id: true,
  externalId: true,
  sourceLineNumber: true,
  transactionDate: true,
  postedDate: true,
  amount: true,
  currency: true,
  merchant: true,
  description: true,
  employee: true,
  reference: true,
  bankStatementId: true,
  vatCode: true,
  glCode: true,
  category: true,
  taxTreatment: true,
  taxRate: true,
  noReceiptRequired: true,
  excludedFromExport: true,
  bankStatement: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.BankTransactionSelect;

type DbUnassignedBankTransaction = Prisma.BankTransactionGetPayload<{ select: typeof unassignedBankTransactionSelect }>;

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  return prisma;
}

function isSchemaMismatchError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function loadBankStatusRunsSafe(prisma: PrismaClient, workspaceId: string) {
  try {
    return await prisma.reconciliationRun.findMany({
      where: { workspaceId },
      include: {
        ...bankStatusRunInclude,
      },
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      console.error("[bank-statements] status decoration is unavailable on this schema:", error);
      return [] as DbBankStatusRun[];
    }
    throw error;
  }
}

function toIso(value?: Date | null) {
  return value ? value.toISOString() : undefined;
}

function toDateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}

function toDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function toWorkspace(workspace: {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  countryProfile: string;
  amountTolerance: Prisma.Decimal;
  dateToleranceDays: number;
  vatRegistered: boolean;
  businessType: string;
}): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    defaultCurrency: workspace.defaultCurrency,
    countryProfile: workspace.countryProfile,
    amountTolerance: Number(workspace.amountTolerance),
    dateToleranceDays: workspace.dateToleranceDays,
    vatRegistered: workspace.vatRegistered,
    businessType: workspace.businessType as Workspace["businessType"],
  };
}

function toUser(user: { id: string; email: string; name: string }): User {
  return { id: user.id, email: user.email, name: user.name };
}

function toVatRule(rule: {
  id: string;
  countryCode: string;
  rate: Prisma.Decimal;
  taxCode: string;
  recoverable: boolean;
  description: string | null;
}): VatRule {
  return {
    id: rule.id,
    countryCode: rule.countryCode,
    rate: Number(rule.rate),
    taxCode: rule.taxCode,
    recoverable: rule.recoverable,
    description: rule.description || "",
  };
}

function toGlRule(rule: {
  id: string;
  glCode: string;
  label: string;
  supplierPattern: string | null;
  keywordPattern: string | null;
  priority: number;
}): GlCodeRule {
  return {
    id: rule.id,
    glCode: rule.glCode,
    label: rule.label,
    supplierPattern: rule.supplierPattern || undefined,
    keywordPattern: rule.keywordPattern || undefined,
    priority: rule.priority,
  };
}

function toCategoryRule(rule: {
  id: string;
  category: string;
  slug: string;
  description: string | null;
  section: string;
  supplierPattern: string | null;
  keywordPattern: string | null;
  priority: number;
  accountType: string;
  statementType: string;
  reportingBucket: string;
  defaultTaxTreatment: string;
  defaultVatRate: Prisma.Decimal;
  defaultVatRecoverable: boolean;
  glCode: string | null;
  isSystemDefault: boolean;
  isActive: boolean;
  isVisible: boolean;
  allowableForTax?: boolean;
  allowablePercentage?: Prisma.Decimal | null;
  sortOrder: number;
}): CategoryRule {
  return {
    id: rule.id,
    category: rule.category,
    slug: rule.slug,
    description: rule.description || undefined,
    section: rule.section as CategoryRule["section"],
    supplierPattern: rule.supplierPattern || undefined,
    keywordPattern: rule.keywordPattern || undefined,
    priority: rule.priority,
    accountType: rule.accountType as CategoryRule["accountType"],
    statementType: rule.statementType as CategoryRule["statementType"],
    reportingBucket: rule.reportingBucket,
    defaultTaxTreatment: rule.defaultTaxTreatment as CategoryRule["defaultTaxTreatment"],
    defaultVatRate: Number(rule.defaultVatRate),
    defaultVatRecoverable: rule.defaultVatRecoverable,
    glCode: rule.glCode || undefined,
    isSystemDefault: rule.isSystemDefault,
    isActive: rule.isActive,
    isVisible: rule.isVisible,
    allowableForTax: rule.allowableForTax ?? true,
    allowablePercentage: rule.allowablePercentage != null ? Number(rule.allowablePercentage) : 100,
    sortOrder: rule.sortOrder,
  };
}

function toTemplate(template: {
  id: string;
  name: string;
  sourceType: string;
  columnMappings: Prisma.JsonValue;
}): MappingTemplate {
  return {
    id: template.id,
    name: template.name,
    sourceType: template.sourceType,
    columnMappings: (template.columnMappings || {}) as Record<string, string>,
  };
}

function toUploadedFile(file: any): UploadedFileMeta {
  return {
    id: file.id,
    fileName: file.fileName,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey || undefined,
    fileKind: file.fileKind as UploadedFileMeta["fileKind"],
  };
}

function toTransaction(
  transaction: DbDetailedRun["transactions"][number] | DbSummaryRun["transactions"][number],
): TransactionRecord {
  return {
    id: transaction.id,
    sourceBankTransactionId: transaction.sourceBankTransactionId || undefined,
    bankStatementId: transaction.sourceBankTransaction?.bankStatementId || undefined,
    bankStatementName: transaction.sourceBankTransaction?.bankStatement?.name || undefined,
    externalId: transaction.externalId || undefined,
    sourceLineNumber: transaction.sourceLineNumber || undefined,
    transactionDate: toDateOnly(transaction.transactionDate),
    postedDate: toDateOnly(transaction.postedDate),
    amount: Number(transaction.amount),
    currency: transaction.currency || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    employee: transaction.employee || undefined,
    reference: transaction.reference || undefined,
    vatCode: transaction.vatCode || undefined,
    glCode: transaction.glCode || undefined,
    category: transaction.category || undefined,
    taxTreatment: transaction.taxTreatment ? transaction.taxTreatment as TransactionRecord["taxTreatment"] : undefined,
    taxRate: transaction.taxRate !== null && transaction.taxRate !== undefined ? Number(transaction.taxRate) : undefined,
    noReceiptRequired: transaction.noReceiptRequired || undefined,
    excludedFromExport: transaction.excludedFromExport || undefined,
    categoryConfidence: (transaction as any).categoryConfidence || undefined,
    categoryReason: (transaction as any).categoryReason || undefined,
    confidenceScore: (transaction as any).confidenceScore ? Number((transaction as any).confidenceScore) : undefined,
  };
}

function toBankTransaction(transaction: DbBankStatement["transactions"][number]): BankTransaction {
  return {
    id: transaction.id,
    bankStatementId: transaction.bankStatementId,
    reconciliationStatus: "unreconciled",
    externalId: transaction.externalId || undefined,
    sourceLineNumber: transaction.sourceLineNumber || undefined,
    transactionDate: toDateOnly(transaction.transactionDate),
    postedDate: toDateOnly(transaction.postedDate),
    amount: Number(transaction.amount),
    currency: transaction.currency || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    employee: transaction.employee || undefined,
    reference: transaction.reference || undefined,
    vatCode: transaction.vatCode || undefined,
    glCode: transaction.glCode || undefined,
    category: transaction.category || undefined,
    taxTreatment: transaction.taxTreatment ? (transaction.taxTreatment as TaxTreatment) : undefined,
    taxRate: transaction.taxRate !== null && transaction.taxRate !== undefined ? Number(transaction.taxRate) : undefined,
    noReceiptRequired: transaction.noReceiptRequired || undefined,
    excludedFromExport: transaction.excludedFromExport || undefined,
    categoryConfidence: (transaction as any).categoryConfidence || undefined,
    categoryReason: (transaction as any).categoryReason || undefined,
    confidenceScore: (transaction as any).confidenceScore ? Number((transaction as any).confidenceScore) : undefined,
  };
}

function toBankStatement(statement: DbBankStatement): BankStatement {
  return {
    id: statement.id,
    name: statement.name,
    fileName: statement.fileName,
    bankName: statement.bankName || undefined,
    accountName: statement.accountName || undefined,
    currency: statement.currency,
    importedAt: statement.importedAt.toISOString(),
    importStatus: statement.importStatus as BankStatement["importStatus"],
    dateRangeStart: toDateOnly(statement.dateRangeStart),
    dateRangeEnd: toDateOnly(statement.dateRangeEnd),
    transactionCount: statement.transactions.length,
    previewHeaders: statement.previewHeaders as string[] | undefined,
    savedColumnMappings: statement.savedColumnMappings as Record<string, string> | undefined,
    transactions: statement.transactions.map(toBankTransaction),
  };
}

function toBankStatementSummary(statement: DbBankStatementSummary): BankStatementSummary {
  return {
    id: statement.id,
    name: statement.name,
    fileName: statement.fileName,
    bankName: statement.bankName || undefined,
    accountName: statement.accountName || undefined,
    currency: statement.currency,
    importedAt: statement.importedAt.toISOString(),
    importStatus: statement.importStatus as BankStatementSummary["importStatus"],
    dateRangeStart: toDateOnly(statement.dateRangeStart),
    dateRangeEnd: toDateOnly(statement.dateRangeEnd),
    transactionCount: statement._count.transactions,
  };
}

function toUnassignedBankTransaction(transaction: DbUnassignedBankTransaction): TransactionRecord {
  return {
    id: transaction.id,
    sourceBankTransactionId: transaction.id,
    bankStatementId: transaction.bankStatementId,
    bankStatementName: transaction.bankStatement.name,
    externalId: transaction.externalId || undefined,
    sourceLineNumber: transaction.sourceLineNumber || undefined,
    transactionDate: toDateOnly(transaction.transactionDate),
    postedDate: toDateOnly(transaction.postedDate),
    amount: Number(transaction.amount),
    currency: transaction.currency || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    employee: transaction.employee || undefined,
    reference: transaction.reference || undefined,
    vatCode: transaction.vatCode || undefined,
    glCode: transaction.glCode || undefined,
    category: transaction.category || undefined,
    taxTreatment: transaction.taxTreatment ? (transaction.taxTreatment as TaxTreatment) : undefined,
    taxRate: transaction.taxRate !== null && transaction.taxRate !== undefined ? Number(transaction.taxRate) : undefined,
    noReceiptRequired: transaction.noReceiptRequired || undefined,
    excludedFromExport: transaction.excludedFromExport || undefined,
    categoryConfidence: (transaction as any).categoryConfidence || undefined,
    categoryReason: (transaction as any).categoryReason || undefined,
    confidenceScore: (transaction as any).confidenceScore ? Number((transaction as any).confidenceScore) : undefined,
  };
}

function toDocument(
  document: DbDetailedRun["documents"][number] | DbSummaryRun["documents"][number],
): ExtractedDocument {
  return {
    id: document.id,
    runId: document.runId,
    fileName: document.fileName,
    supplier: document.supplier || undefined,
    issueDate: toDateOnly(document.issueDate),
    gross: toNumber(document.gross),
    net: toNumber(document.net),
    vat: toNumber(document.vat),
    vatRateSummary: document.vatRateSummary || undefined,
    documentNumber: document.documentNumber || undefined,
    countryCode: document.countryCode || undefined,
    currency: document.currency || undefined,
    rawExtractedText: document.rawExtractedText || undefined,
    storageKey: (document as any).storageKey || undefined,
    confidence: toNumber(document.extractionConfidence) ?? 0,
    duplicateFingerprint: document.duplicateFingerprint || undefined,
    taxLines: document.taxLines.map((taxLine) => ({
      id: taxLine.id,
      label: taxLine.label || "",
      netAmount: toNumber(taxLine.netAmount) ?? 0,
      taxAmount: toNumber(taxLine.taxAmount) ?? 0,
      grossAmount: toNumber(taxLine.grossAmount) ?? 0,
      rate: toNumber(taxLine.rate) ?? 0,
      recoverable: taxLine.recoverable,
      vatCode: taxLine.vatCode || undefined,
    })),
  };
}

function toMatch(
  match: DbDetailedRun["matches"][number] | DbSummaryRun["matches"][number],
): MatchDecision {
  return {
    id: match.id,
    transactionId: match.transactionId,
    documentId: match.documentId || undefined,
    status: match.status as MatchDecision["status"],
    score: Number(match.score),
    rationale: match.rationale as unknown as MatchDecision["rationale"],
    selected: match.selected,
  };
}

function toReviewAction(action: DbDetailedRun["reviewActions"][number]): ReviewAction {
  return {
    id: action.id,
    runId: action.runId,
    actionType: action.actionType as ReviewAction["actionType"],
    field: action.field || undefined,
    beforeValue: action.beforeValue || undefined,
    afterValue: action.afterValue || undefined,
    note: action.note || undefined,
    createdAt: action.createdAt.toISOString(),
    actorName: action.actor.name,
  };
}

function toExportRecord(record: DbDetailedRun["exports"][number]): ExportRecord {
  return {
    id: record.id,
    format: record.format as ExportRecord["format"],
    fileName: record.fileName,
    createdAt: record.createdAt.toISOString(),
  };
}

function toWorkspaceMember(m: any): import("@/lib/domain/types").WorkspaceMember {
  return {
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  };
}

function toInvitation(i: any): import("@/lib/domain/types").Invitation {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    status: i.status,
    invitedByName: i.invitedBy.name,
    createdAt: i.createdAt.toISOString(),
    token: i.status === "PENDING" ? i.token : undefined,
    expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : undefined,
    workspace: i.workspace ? {
      id: i.workspace.id,
      name: i.workspace.name,
    } : undefined,
  };
}

function toDomainRun(run: DbDetailedRun): ReconciliationRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status as ReconciliationRun["status"],
    createdAt: run.createdAt.toISOString(),
    processedAt: toIso(run.processedAt),
    entity: run.entity || undefined,
    period: run.period || undefined,
    locked: run.locked,
    lockedAt: toIso(run.lockedAt),
    lockedBy: run.lockedBy || undefined,
    countryProfile: run.countryProfile || undefined,
    bankStatementId: run.bankStatementId || undefined,
    bankSourceMode: run.bankSourceMode as ReconciliationRun["bankSourceMode"] | undefined,
    bankSourceLabel: run.bankSourceLabel || run.bankStatement?.name || undefined,
    defaultCurrency: run.workspace.defaultCurrency,
    transactionFileName: run.transactionFileName || undefined,
    fxRates: (run.fxRates as Record<string, number> | null) || undefined,
    uploadedFiles: run.uploadedFiles.map(toUploadedFile),
    transactions: run.transactions.map(toTransaction),
    documents: run.documents.map(toDocument),
    matches: run.matches.map(toMatch),
    auditTrail: run.reviewActions.map(toReviewAction),
    exports: run.exports.map(toExportRecord),
  };
}

function toSummaryDomainRun(run: DbSummaryRun): ReconciliationRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status as ReconciliationRun["status"],
    createdAt: run.createdAt.toISOString(),
    processedAt: toIso(run.processedAt),
    entity: run.entity || undefined,
    period: run.period || undefined,
    locked: run.locked,
    lockedAt: toIso(run.lockedAt),
    lockedBy: run.lockedBy || undefined,
    countryProfile: run.countryProfile || undefined,
    bankStatementId: run.bankStatementId || undefined,
    bankSourceMode: run.bankSourceMode as ReconciliationRun["bankSourceMode"] | undefined,
    bankSourceLabel: run.bankSourceLabel || run.bankStatement?.name || undefined,
    defaultCurrency: run.workspace.defaultCurrency,
    transactionFileName: run.transactionFileName || undefined,
    fxRates: (run.fxRates as Record<string, number> | null) || undefined,
    uploadedFiles: [],
    transactions: run.transactions.map(toTransaction),
    documents: run.documents.map(toDocument),
    matches: run.matches.map(toMatch),
    auditTrail: [],
    exports: [],
  };
}

function toRunListItem(
  run: ReconciliationRun,
  vatRules: VatRule[],
  glRules: GlCodeRule[],
  categoryRules: CategoryRule[],
): RunListItem {
  return {
    id: run.id,
    name: run.name,
    status: run.status,
    createdAt: run.createdAt,
    processedAt: run.processedAt,
    entity: run.entity,
    period: run.period,
    locked: run.locked,
    bankSourceMode: run.bankSourceMode,
    bankSourceLabel: run.bankSourceLabel,
    summary: buildRunSummary(buildReviewRows(run, vatRules, glRules, categoryRules)),
  };
}

function toBankStatusRun(run: DbBankStatusRun): ReconciliationRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status as ReconciliationRun["status"],
    createdAt: run.createdAt.toISOString(),
    processedAt: toIso(run.processedAt),
    entity: run.entity || undefined,
    period: run.period || undefined,
    locked: run.locked,
    lockedAt: toIso(run.lockedAt),
    lockedBy: run.lockedBy || undefined,
    countryProfile: run.countryProfile || undefined,
    defaultCurrency: undefined,
    uploadedFiles: [],
    transactions: run.transactions.map((transaction) => ({
      id: transaction.id,
      sourceBankTransactionId: transaction.sourceBankTransactionId || undefined,
      amount: 0,
      currency: "",
      merchant: "",
      description: "",
      excludedFromExport: transaction.excludedFromExport,
    })),
    documents: [],
    matches: run.matches.map((match) => ({
      id: match.id,
      transactionId: match.transactionId,
      documentId: match.documentId || undefined,
      status: match.status as MatchDecision["status"],
      score: 0,
      rationale: {
        amountScore: 0,
        dateScore: 0,
        supplierScore: 0,
        filenameScore: 0,
        employeeScore: 0,
        currencyScore: 0,
        invoiceNumberScore: 0,
        referenceScore: 0,
        notes: [],
      },
      selected: match.selected,
    })),
    auditTrail: [],
    exports: [],
  };
}

async function ensureBootstrap(prisma: PrismaClient) {
  const result = await resolveUserWorkspace(prisma);
  const workspace = result.workspace;
  const shouldSeedWorkspaceData = result.isNewWorkspace;

  if (shouldSeedWorkspaceData) {
    await prisma.mappingTemplate.createMany({
      data: demoStore.templates.map((template) => ({
        id: template.id,
        workspaceId: workspace.id,
        name: template.name,
        sourceType: template.sourceType,
        columnMappings: template.columnMappings,
      })),
    });
  }

  if (shouldSeedWorkspaceData) {
    await prisma.categoryRule.createMany({
      data: demoStore.categoryRules.map((rule) => ({
        id: rule.id,
        workspaceId: workspace.id,
        category: rule.category,
        slug: rule.slug,
        description: rule.description,
        section: rule.section,
        supplierPattern: rule.supplierPattern,
        keywordPattern: rule.keywordPattern,
        priority: rule.priority,
        accountType: rule.accountType,
        statementType: rule.statementType,
        reportingBucket: rule.reportingBucket,
        defaultTaxTreatment: rule.defaultTaxTreatment,
        defaultVatRate: rule.defaultVatRate,
        defaultVatRecoverable: rule.defaultVatRecoverable,
        glCode: rule.glCode,
        isSystemDefault: rule.isSystemDefault,
        isActive: rule.isActive,
        isVisible: rule.isVisible,
        allowableForTax: rule.allowableForTax ?? true,
        allowablePercentage: rule.allowablePercentage ?? 100,
        sortOrder: rule.sortOrder,
      })),
    });
  }

  if (shouldSeedWorkspaceData) {
    for (const statement of demoStore.bankStatements) {
      await prisma.bankStatement.create({
        data: {
          id: statement.id,
          workspaceId: workspace.id,
          name: statement.name,
          fileName: statement.fileName,
          bankName: statement.bankName,
          accountName: statement.accountName,
          currency: statement.currency,
          importedAt: new Date(statement.importedAt),
          importStatus: statement.importStatus,
          dateRangeStart: toDate(statement.dateRangeStart),
          dateRangeEnd: toDate(statement.dateRangeEnd),
          previewHeaders: statement.previewHeaders as Prisma.InputJsonValue | undefined,
          savedColumnMappings: statement.savedColumnMappings as Prisma.InputJsonValue | undefined,
          transactions: {
            create: statement.transactions.map((transaction) => ({
              id: transaction.id,
              externalId: transaction.externalId,
              sourceLineNumber: transaction.sourceLineNumber,
              transactionDate: toDate(transaction.transactionDate),
              postedDate: toDate(transaction.postedDate),
              amount: transaction.amount,
              currency: transaction.currency,
              merchant: transaction.merchant,
              description: transaction.description,
              employee: transaction.employee,
              reference: transaction.reference,
            })),
          },
        },
      });
    }
  }

  return {
    workspace: result.workspace,
    user: toUser(result.user),
  };
};

async function loadRun(prisma: PrismaClient, runId: string) {
  return prisma.reconciliationRun.findUnique({
    where: { id: runId },
    include: {
      ...detailedRunInclude,
      workspace: true,
    },
  });
}

async function persistRun(
  prisma: PrismaClient,
  run: ReconciliationRun,
  workspaceId: string,
  actorId: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.reconciliationRun.upsert({
      where: { id: run.id },
      update: {
        name: run.name,
        status: run.status,
        entity: run.entity,
        period: run.period,
        locked: !!run.locked,
        lockedAt: toDate(run.lockedAt),
        lockedBy: run.lockedBy,
        countryProfile: run.countryProfile,
        bankStatementId: run.bankStatementId,
        bankSourceMode: run.bankSourceMode,
        bankSourceLabel: run.bankSourceLabel,
        processedAt: toDate(run.processedAt),
        transactionFileName: run.transactionFileName,
        notes: undefined,
        fxRates: run.fxRates as Prisma.InputJsonValue | undefined,
        workspaceId,
      },
        create: {
          id: run.id,
          name: run.name,
          status: run.status,
          entity: run.entity,
          period: run.period,
          locked: !!run.locked,
          lockedAt: toDate(run.lockedAt),
          lockedBy: run.lockedBy,
          countryProfile: run.countryProfile,
          bankStatementId: run.bankStatementId,
          bankSourceMode: run.bankSourceMode,
          bankSourceLabel: run.bankSourceLabel,
          createdAt: new Date(run.createdAt),
        processedAt: toDate(run.processedAt),
        transactionFileName: run.transactionFileName,
        fxRates: run.fxRates as Prisma.InputJsonValue | undefined,
        workspaceId,
      },
    });

    await tx.reviewAction.deleteMany({ where: { runId: run.id } });
    await tx.matchDecision.deleteMany({ where: { runId: run.id } });
    await tx.documentTaxLine.deleteMany({ where: { document: { runId: run.id } } });
    await tx.document.deleteMany({ where: { runId: run.id } });
    await tx.transaction.deleteMany({ where: { runId: run.id } });
    await tx.uploadedFile.deleteMany({ where: { runId: run.id } });
    await tx.exportHistory.deleteMany({ where: { runId: run.id } });

    if (run.uploadedFiles.length > 0) {
      await tx.uploadedFile.createMany({
        data: run.uploadedFiles.map((file) => ({
          id: file.id,
          runId: run.id,
          fileName: file.fileName,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          storageKey: `${run.id}/${file.fileName}`,
          fileKind: file.fileKind,
        })),
      });
    }

    if (run.transactions.length > 0) {
      await tx.transaction.createMany({
        data: run.transactions.map((transaction) => ({
          id: transaction.id,
          sourceBankTransactionId: transaction.sourceBankTransactionId,
          runId: run.id,
          externalId: transaction.externalId,
          sourceLineNumber: transaction.sourceLineNumber,
          transactionDate: toDate(transaction.transactionDate),
          postedDate: toDate(transaction.postedDate),
          amount: transaction.amount,
          currency: transaction.currency,
          merchant: transaction.merchant,
          description: transaction.description,
          employee: transaction.employee,
          reference: transaction.reference,
          vatCode: transaction.vatCode,
          glCode: transaction.glCode,
          category: transaction.category,
          taxTreatment: transaction.taxTreatment,
          taxRate: transaction.taxRate,
          noReceiptRequired: !!transaction.noReceiptRequired,
          excludedFromExport: !!transaction.excludedFromExport,
        })),
      });
    }

    for (const document of run.documents) {
      await tx.document.create({
        data: {
          id: document.id,
          runId: run.id,
          fileName: document.fileName,
          supplier: document.supplier,
          issueDate: toDate(document.issueDate),
          gross: document.gross,
          net: document.net,
          vat: document.vat,
          vatRateSummary: document.vatRateSummary,
          documentNumber: document.documentNumber,
          countryCode: document.countryCode,
          currency: document.currency,
          rawExtractedText: document.rawExtractedText,
          extractionConfidence: document.confidence,
          duplicateFingerprint: document.duplicateFingerprint,
          taxLines: {
            create: document.taxLines.map((taxLine) => ({
              id: taxLine.id,
              label: taxLine.label,
              netAmount: taxLine.netAmount,
              taxAmount: taxLine.taxAmount,
              grossAmount: taxLine.grossAmount,
              rate: taxLine.rate,
              recoverable: taxLine.recoverable,
              vatCode: taxLine.vatCode,
            })),
          },
        },
      });
    }

    if (run.matches.length > 0) {
      await tx.matchDecision.createMany({
        data: run.matches.map((match) => ({
          id: match.id,
          runId: run.id,
          transactionId: match.transactionId,
          documentId: match.documentId,
          status: match.status,
          score: match.score,
          rationale: match.rationale as unknown as Prisma.InputJsonValue,
          selected: match.selected,
        })),
      });
    }

    if (run.auditTrail.length > 0) {
      await tx.reviewAction.createMany({
        data: run.auditTrail.map((action) => ({
          id: action.id,
          runId: run.id,
          transactionId: undefined,
          documentId: undefined,
          actorId,
          actionType: action.actionType,
          field: action.field,
          beforeValue: action.beforeValue,
          afterValue: action.afterValue,
          note: action.note,
          createdAt: new Date(action.createdAt),
        })),
      });
    }

    if (run.exports.length > 0) {
      await tx.exportHistory.createMany({
        data: run.exports.map((record) => ({
          id: record.id,
          runId: run.id,
          actorId,
          format: record.format,
          fileName: record.fileName,
          createdAt: new Date(record.createdAt),
        })),
      });
    }
  });
}

export const basePrismaRepository: Repository = {
  async getCurrentUser() {
    const prisma = requirePrisma();
    const { user } = await ensureBootstrap(prisma);
    return toUser(user);
  },

  async getWorkspace() {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    return toWorkspace(workspace);
  },

  async updateWorkspace(input: UpdateWorkspaceInput): Promise<Workspace> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        ...(input.vatRegistered !== undefined && { vatRegistered: input.vatRegistered }),
        ...(input.businessType !== undefined && { businessType: input.businessType }),
        ...(input.amountTolerance !== undefined && { amountTolerance: input.amountTolerance }),
        ...(input.dateToleranceDays !== undefined && { dateToleranceDays: input.dateToleranceDays }),
        ...(input.defaultCurrency !== undefined && { defaultCurrency: input.defaultCurrency }),
        ...(input.countryProfile !== undefined && { countryProfile: input.countryProfile }),
      },
    });
    return toWorkspace(updated);
  },

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const prisma = requirePrisma();
    const { workspace, user } = await ensureBootstrap(prisma);
    const [runs, templates, vatRules, glRules, categoryRules] = await Promise.all([
      prisma.reconciliationRun.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        include: {
          ...summaryRunInclude,
          workspace: true,
        },
      }),
      prisma.mappingTemplate.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { taxCode: "asc" } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
      prisma.categoryRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
    ]);

    const domainRuns = runs.map(toSummaryDomainRun);
    const domainVatRules = vatRules.map(toVatRule);
    const domainGlRules = glRules.map(toGlRule);
    const domainCatRules = mergeWorkspaceCategoryRules(categoryRules.map(toCategoryRule));

    return {
      workspace: toWorkspace(workspace),
      user: toUser(user),
      runs: domainRuns.map((run) => toRunListItem(run, domainVatRules, domainGlRules, domainCatRules)),
      templates: templates.map(toTemplate),
      vatRules: domainVatRules,
      glRules: domainGlRules,
      categoryRules: domainCatRules,
    };
  },

  async getSettingsSnapshot(): Promise<SettingsSnapshot> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const [templates, vatRules, glRules, categoryRules, memberships, invitations] = await Promise.all([
      prisma.mappingTemplate.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { taxCode: "asc" } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
      prisma.categoryRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
      prisma.membership.findMany({
        where: { workspaceId: workspace.id },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.invitation.findMany({
        where: { workspaceId: workspace.id, status: "PENDING" },
        include: { invitedBy: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      workspace: toWorkspace(workspace),
      templates: templates.map(toTemplate),
      vatRules: vatRules.map(toVatRule),
      glRules: glRules.map(toGlRule),
      categoryRules: mergeWorkspaceCategoryRules(categoryRules.map(toCategoryRule)),
      memberships: memberships.map(toWorkspaceMember),
      invitations: invitations.map(toInvitation),
    };
  },

  async getRunSummaries() {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const [runs, vatRules, glRules, categoryRules] = await Promise.all([
      prisma.reconciliationRun.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        include: {
          ...summaryRunInclude,
          workspace: true,
        },
      }),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { taxCode: "asc" } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
      prisma.categoryRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
    ]);

    const domainVatRules = vatRules.map(toVatRule);
    const domainGlRules = glRules.map(toGlRule);
    const domainCategoryRules = mergeWorkspaceCategoryRules(categoryRules.map(toCategoryRule));

    return runs.map((run) =>
      toRunListItem(
        toSummaryDomainRun(run),
        domainVatRules,
        domainGlRules,
        domainCategoryRules,
      ),
    );
  },

  async getRun(runId) {
    const prisma = requirePrisma();
    await ensureBootstrap(prisma);
    const run = await loadRun(prisma, runId);
    return run ? toDomainRun(run) : null;
  },

  async getRunsWithTransactions(): Promise<ReconciliationRun[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const runs = await prisma.reconciliationRun.findMany({
      where: { workspaceId: workspace.id },
      include: {
        ...summaryRunInclude,
        workspace: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return runs.map(toSummaryDomainRun);
  },

  async getRunRows(runId): Promise<ReviewRow[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const [run, vatRules, glRules, categoryRules] = await Promise.all([
      loadRun(prisma, runId),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id } }),
      prisma.categoryRule.findMany({ where: { workspaceId: workspace.id } }),
    ]);

    if (!run) {
      throw new Error(`Run ${runId} was not found.`);
    }

    return buildReviewRows(
      toDomainRun(run),
      vatRules.map(toVatRule),
      glRules.map(toGlRule),
      mergeWorkspaceCategoryRules(categoryRules.map(toCategoryRule)),
    );
  },

  async getUnassignedBankTransactions(): Promise<TransactionRecord[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);

    try {
      const transactions = await prisma.bankTransaction.findMany({
        where: {
          bankStatement: { workspaceId: workspace.id },
          runTransactions: { none: {} },
        },
        select: unassignedBankTransactionSelect,
        orderBy: [
          { transactionDate: "desc" },
          { postedDate: "desc" },
        ],
      });

      return transactions.map(toUnassignedBankTransaction);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        console.error("[bank-transactions] unassigned pool is unavailable on this schema:", error);
        return [];
      }
      throw error;
    }
  },

  async getTemplates() {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const templates = await prisma.mappingTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    });
    return templates.map(toTemplate);
  },

  async getBankStatementSummaries(): Promise<BankStatementSummary[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    try {
      const statements = await prisma.bankStatement.findMany({
        where: { workspaceId: workspace.id },
        select: bankStatementSummarySelect,
        orderBy: { importedAt: "desc" },
      });
      return statements.map(toBankStatementSummary);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        console.error("[bank-statements] summary list is unavailable on this schema:", error);
        return [];
      }
      throw error;
    }
  },

  async getBankStatements(): Promise<BankStatement[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    let statements: DbBankStatement[] = [];
    try {
      statements = await prisma.bankStatement.findMany({
        where: { workspaceId: workspace.id },
        include: bankStatementInclude,
        orderBy: { importedAt: "desc" },
      });
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        console.error("[bank-statements] schema is behind the deployed code:", error);
        return [];
      }
      throw error;
    }
    const runs = await loadBankStatusRunsSafe(prisma, workspace.id);

    return decorateBankStatementsWithStatuses(
      statements.map(toBankStatement),
      runs.map(toBankStatusRun),
    );
  },

  async getBankStatement(statementId: string): Promise<BankStatement | null> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    let statement: DbBankStatement | null = null;
    try {
      statement = await prisma.bankStatement.findFirst({
        where: { id: statementId, workspaceId: workspace.id },
        include: bankStatementInclude,
      });
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        console.error("[bank-statements] schema is behind the deployed code:", error);
        return null;
      }
      throw error;
    }

    if (!statement) {
      return null;
    }

    const runs = await loadBankStatusRunsSafe(prisma, workspace.id);

    return decorateBankStatementsWithStatuses(
      [toBankStatement(statement)],
      runs.map(toBankStatusRun),
    )[0];
  },

  async importBankStatement(input: ImportBankStatementInput): Promise<BankStatement> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const metadata = deriveStatementMetadata(
      input.fileName,
      input.transactions,
      input.defaultCurrency,
    );

    const created = await prisma.bankStatement.create({
      data: {
        name: input.name,
        fileName: input.fileName,
        bankName: metadata.bankName,
        accountName: metadata.accountName,
        currency: metadata.currency,
        importStatus: "imported",
        dateRangeStart: toDate(metadata.dateRangeStart),
        dateRangeEnd: toDate(metadata.dateRangeEnd),
        previewHeaders: input.headers as Prisma.InputJsonValue,
        savedColumnMappings: input.columnMappings as Prisma.InputJsonValue,
        workspaceId: workspace.id,
        transactions: {
          create: input.transactions.map((transaction) => ({
            externalId: transaction.externalId,
            sourceLineNumber: transaction.sourceLineNumber,
            transactionDate: toDate(transaction.transactionDate),
            postedDate: toDate(transaction.postedDate),
            amount: transaction.amount,
            currency: transaction.currency,
            merchant: transaction.merchant,
            description: transaction.description,
            employee: transaction.employee,
            reference: transaction.reference,
          })),
        },
      },
      include: bankStatementInclude,
    });

    return toBankStatement(created);
  },

  async deleteBankStatement(id: string): Promise<void> {
    const prisma = requirePrisma();
    try {
      await prisma.$transaction(async (tx) => {
        const sourceTransactions = await tx.bankTransaction.findMany({
          where: { bankStatementId: id },
          select: { id: true },
        });
        const sourceTransactionIds = sourceTransactions.map((transaction) => transaction.id);

        if (sourceTransactionIds.length > 0) {
          await tx.transaction.deleteMany({
            where: {
              sourceBankTransactionId: { in: sourceTransactionIds },
            },
          });
        }

        await tx.reconciliationRun.updateMany({
          where: { bankStatementId: id },
          data: {
            bankStatementId: null,
            bankSourceMode: "later",
            bankSourceLabel: null,
          },
        });

        await tx.bankStatement.delete({ where: { id } });
      });
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw new Error(
          "Bank statement storage is not ready yet. Run the latest database migrations and try again.",
        );
      }
      throw error;
    }
  },

  async attachBankSourceToRun(input: AttachBankSourceInput): Promise<ReconciliationRun> {
    const prisma = requirePrisma();
    const { workspace, user } = await ensureBootstrap(prisma);
    const [run, statements] = await Promise.all([
      loadRun(prisma, input.runId),
      prisma.bankStatement.findMany({
        where: { workspaceId: workspace.id },
        include: bankStatementInclude,
      }),
    ]);
    const runs = await loadBankStatusRunsSafe(prisma, workspace.id);

    if (!run) {
      throw new Error(`Run ${input.runId} was not found.`);
    }

    const domainRun = toDomainRun(run);

    if (input.bankSourceMode === "skip" || input.bankSourceMode === "later") {
      domainRun.bankSourceMode = input.bankSourceMode;
      domainRun.bankStatementId = undefined;
      domainRun.bankSourceLabel = undefined;
      await persistRun(prisma, domainRun, workspace.id, user.id);
      return domainRun;
    }

    const picked = pickTransactionsForBankSource(
      statements.map(toBankStatement),
      runs.filter((candidate) => candidate.id !== input.runId).map(toBankStatusRun),
      input.bankSourceMode,
      input.bankStatementId,
    );

    domainRun.bankSourceMode = input.bankSourceMode;
    domainRun.bankStatementId = picked.statement?.id;
    domainRun.bankSourceLabel = picked.label;
    domainRun.transactionFileName = picked.statement?.fileName ?? domainRun.transactionFileName;
    domainRun.transactions = picked.statement
      ? cloneBankTransactionsForRun(picked.statement, picked.transactions)
      : picked.transactions.map((transaction, index) => ({
          ...transaction,
          id: `txn_pool_${Date.now()}_${index + 1}`,
          sourceBankTransactionId: transaction.id,
          bankStatementId: transaction.bankStatementId,
          bankStatementName: statements.find((statement) => statement.id === transaction.bankStatementId)?.name,
        }));

    await persistRun(prisma, domainRun, workspace.id, user.id);
    return domainRun;
  },

  async getVatRules(): Promise<VatRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const rules = await prisma.vatRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { taxCode: "asc" },
    });
    return rules.map(toVatRule);
  },

  async upsertVatRules(input: UpsertVatRulesInput): Promise<VatRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const countryCodes = [...new Set(input.rules.map((rule) => rule.countryCode))];

    await prisma.$transaction(async (tx) => {
      await tx.vatRule.deleteMany({
        where: {
          workspaceId: workspace.id,
          countryCode: { in: countryCodes },
        },
      });

      if (input.rules.length > 0) {
        await tx.vatRule.createMany({
          data: input.rules.map((rule) => ({
            id: rule.id,
            workspaceId: workspace.id,
            countryCode: rule.countryCode,
            rate: rule.rate,
            taxCode: rule.taxCode,
            recoverable: rule.recoverable,
            description: rule.description,
          })),
        });
      }
    });

    const rules = await prisma.vatRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ countryCode: "asc" }, { rate: "asc" }, { taxCode: "asc" }],
    });

    return rules.map(toVatRule);
  },

  async replaceAllVatRules(rules: VatRule[]): Promise<VatRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);

    await prisma.$transaction(async (tx) => {
      await tx.vatRule.deleteMany({ where: { workspaceId: workspace.id } });
      if (rules.length > 0) {
        await tx.vatRule.createMany({
          data: rules.map((rule) => ({
            id: rule.id,
            workspaceId: workspace.id,
            countryCode: rule.countryCode,
            rate: rule.rate,
            taxCode: rule.taxCode,
            recoverable: rule.recoverable,
            description: rule.description,
          })),
        });
      }
    });

    const updated = await prisma.vatRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ countryCode: "asc" }, { rate: "asc" }],
    });
    return updated.map(toVatRule);
  },

  async upsertGlCodeRules(input: UpsertGlCodeRulesInput): Promise<GlCodeRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const glCodes = [...new Set(input.rules.map((rule) => rule.glCode))];

    await prisma.$transaction(async (tx) => {
      await tx.glCodeRule.deleteMany({
        where: {
          workspaceId: workspace.id,
          glCode: { in: glCodes },
        },
      });

      if (input.rules.length > 0) {
        await tx.glCodeRule.createMany({
          data: input.rules.map((rule) => ({
            id: rule.id,
            workspaceId: workspace.id,
            glCode: rule.glCode,
            label: rule.label,
            supplierPattern: rule.supplierPattern,
            keywordPattern: rule.keywordPattern,
            priority: rule.priority,
          })),
        });
      }
    });

    const rules = await prisma.glCodeRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ priority: "asc" }, { glCode: "asc" }],
    });

    return rules.map(toGlRule);
  },

  async replaceAllGlCodeRules(rules: GlCodeRule[]): Promise<GlCodeRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);

    await prisma.$transaction(async (tx) => {
      await tx.glCodeRule.deleteMany({ where: { workspaceId: workspace.id } });

      if (rules.length > 0) {
        await tx.glCodeRule.createMany({
          data: rules.map((rule) => ({
            id: rule.id,
            workspaceId: workspace.id,
            glCode: rule.glCode,
            label: rule.label,
            supplierPattern: rule.supplierPattern,
            keywordPattern: rule.keywordPattern,
            priority: rule.priority,
          })),
        });
      }
    });

    const updated = await prisma.glCodeRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ priority: "asc" }, { glCode: "asc" }],
    });

    return updated.map(toGlRule);
  },

  async getCategoryRules(): Promise<CategoryRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const rules = await prisma.categoryRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ sortOrder: "asc" }, { priority: "asc" }, { category: "asc" }],
    });
    return mergeWorkspaceCategoryRules(rules.map(toCategoryRule));
  },

  async replaceAllCategoryRules(input: ReplaceCategoryRulesInput): Promise<CategoryRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);

    await prisma.$transaction(async (tx) => {
      await tx.categoryRule.deleteMany({ where: { workspaceId: workspace.id } });
      if (input.rules.length > 0) {
        await tx.categoryRule.createMany({
          data: input.rules.map((rule) => ({
            id: rule.id,
            workspaceId: workspace.id,
            category: rule.category,
            slug: rule.slug,
            description: rule.description,
            section: rule.section,
            supplierPattern: rule.supplierPattern,
            keywordPattern: rule.keywordPattern,
            priority: rule.priority,
            accountType: rule.accountType,
            statementType: rule.statementType,
            reportingBucket: rule.reportingBucket,
            defaultTaxTreatment: rule.defaultTaxTreatment,
            defaultVatRate: rule.defaultVatRate,
            defaultVatRecoverable: rule.defaultVatRecoverable,
            glCode: rule.glCode,
            isSystemDefault: rule.isSystemDefault,
            isActive: rule.isActive,
            isVisible: rule.isVisible,
            allowableForTax: rule.allowableForTax ?? true,
            allowablePercentage: rule.allowablePercentage ?? 100,
            sortOrder: rule.sortOrder,
          })),
        });
      }
    });

    const updated = await prisma.categoryRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ sortOrder: "asc" }, { priority: "asc" }, { category: "asc" }],
    });
    return updated.map(toCategoryRule);
  },

  async setTransactionCategory(
    transactionId: string, 
    category: string | null,
    reason?: string,
    confidenceScore?: number
  ): Promise<void> {
    const prisma = requirePrisma();
    const richUpdate = {
      category: category ?? null,
      categoryReason: reason ?? null,
      confidenceScore: confidenceScore ?? null,
      categoryConfidence: reason ? "ai" : undefined,
    };
    const legacyUpdate = {
      category: category ?? null,
    };

    const updateWithFallback = async (
      updater: (data: typeof richUpdate | typeof legacyUpdate) => Promise<unknown>,
    ) => {
      try {
        await updater(richUpdate);
        return true;
      } catch (error) {
        if (isSchemaMismatchError(error)) {
          await updater(legacyUpdate);
          return true;
        }
        return false;
      }
    };

    const updatedTransaction = await updateWithFallback((data) =>
      prisma.transaction.update({
        where: { id: transactionId },
        data,
      }),
    );

    if (updatedTransaction) {
      return;
    }

    const updatedBankTransaction = await updateWithFallback((data) =>
      prisma.bankTransaction.update({
        where: { id: transactionId },
        data,
      }),
    );

    if (!updatedBankTransaction) {
      console.warn(`[setTransactionCategory] Failed to update transaction ${transactionId} in both tables.`);
    }
  },

  async setTransactionAllowable(transactionId: string, allowable: boolean): Promise<void> {
    const prisma = requirePrisma();
    
    // Try updating assigned transaction first
    try {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { noReceiptRequired: !allowable }, // Mapping "Allowable" to the inverse of "No Receipt Required" field which is used for tax-readiness in this schema
      });
    } catch {
      await prisma.bankTransaction.update({
        where: { id: transactionId },
        data: { noReceiptRequired: !allowable },
      }).catch(() => {
        console.warn(`[setTransactionAllowable] Failed to update transaction ${transactionId}`);
      });
    }
  },
  async deleteTransactions(ids: string[]): Promise<void> {
    const prisma = requirePrisma();
    await prisma.$transaction(async (tx) => {
      const runTransactions = await tx.transaction.findMany({
        where: { id: { in: ids } },
        select: { id: true, sourceBankTransactionId: true },
      });
      const directBankTransactions = await tx.bankTransaction.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });

      const sourceBankTransactionIds = Array.from(
        new Set([
          ...runTransactions
            .map((transaction) => transaction.sourceBankTransactionId)
            .filter((value): value is string => Boolean(value)),
          ...directBankTransactions.map((transaction) => transaction.id),
        ]),
      );

      if (sourceBankTransactionIds.length > 0) {
        await tx.transaction.deleteMany({
          where: {
            OR: [
              { id: { in: ids } },
              { sourceBankTransactionId: { in: sourceBankTransactionIds } },
            ],
          },
        });
      } else {
        await tx.transaction.deleteMany({ where: { id: { in: ids } } });
      }

      if (sourceBankTransactionIds.length > 0) {
        await tx.bankTransaction.deleteMany({
          where: {
            id: { in: sourceBankTransactionIds },
          },
        });
      }
    });
  },

  async createRun(input: CreateRunInput): Promise<ReconciliationRun> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const templates = await prisma.mappingTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    });
    const selectedTemplate = templates.find((template) => template.id === input.templateId);

    const created = await prisma.reconciliationRun.create({
      data: {
        name: input.name,
        status: "awaiting_mapping",
        entity: input.entity,
        period: input.period,
        countryProfile: input.countryProfile || workspace.countryProfile,
        bankStatementId: input.bankStatementId,
        bankSourceMode: input.bankSourceMode,
        bankSourceLabel: input.bankSourceLabel,
        transactionFileName: input.transactionFileName,
        workspaceId: workspace.id,
      },
      include: {
        ...detailedRunInclude,
        workspace: true,
      },
    });

    const domainRun = toDomainRun(created);
    domainRun.defaultCurrency = input.defaultCurrency || workspace.defaultCurrency;
    domainRun.countryProfile = input.countryProfile || workspace.countryProfile;
    domainRun.bankStatementId = input.bankStatementId;
    domainRun.bankSourceMode = input.bankSourceMode;
    domainRun.bankSourceLabel = input.bankSourceLabel;
    domainRun.savedColumnMappings = selectedTemplate
      ? (selectedTemplate.columnMappings as Record<string, string>)
      : undefined;
    domainRun.previewHeaders = ["Date", "Amount", "Merchant", "Description", "Currency"];
    return domainRun;
  },

  async deleteRun(runId: string): Promise<void> {
    const prisma = requirePrisma();
    await ensureBootstrap(prisma);

    await prisma.reconciliationRun.delete({ where: { id: runId } });
  },

  async updateRun(run: ReconciliationRun): Promise<ReconciliationRun> {
    const prisma = requirePrisma();
    const { workspace, user } = await ensureBootstrap(prisma);
    await persistRun(prisma, run, workspace.id, user.id);
    const reloaded = await loadRun(prisma, run.id);
    if (!reloaded) {
      throw new Error(`Run ${run.id} was not found after update.`);
    }
    const domainRun = toDomainRun(reloaded);
    domainRun.savedColumnMappings = run.savedColumnMappings;
    domainRun.previewHeaders = run.previewHeaders;
    return domainRun;
  },

  async saveReviewMutation(input: ReviewMutationInput): Promise<ReviewMutationResult> {
    const prisma = requirePrisma();
    const { workspace, user } = await ensureBootstrap(prisma);
    const [run, templates] = await Promise.all([
      loadRun(prisma, input.runId),
      prisma.mappingTemplate.findMany({ where: { workspaceId: workspace.id } }),
    ]);

    if (!run) {
      throw new Error(`Run ${input.runId} was not found.`);
    }

    const domainRun = toDomainRun(run);
    const result = applyReviewMutationToRun(domainRun, input, user.name);
    domainRun.savedColumnMappings = domainRun.savedColumnMappings || (templates[0]?.columnMappings as Record<string, string> | undefined);
    await persistRun(prisma, domainRun, workspace.id, user.id);
    return result;
  },

  async getUserWorkspaces() {
    const prisma = requirePrisma();
    const { user } = await ensureBootstrap(prisma);
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  },
  async getInvitationByToken(token: string) {
    const prisma = requirePrisma();
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: invitationInclude,
    });
    if (!invitation) return null;
    return toInvitation(invitation);
  },
  async acceptInvitation(token: string, userId: string, email: string, name: string) {
    const prisma = requirePrisma();
    try {
      return await prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.findUnique({
          where: { token },
          include: { workspace: true },
        });

        if (!invitation || invitation.status !== "PENDING") {
          throw new Error("Invitation not found or no longer pending.");
        }

        if (invitation.expiresAt < new Date()) {
          await tx.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
          });
          throw new Error("Invitation has expired.");
        }

        // 1. Sync user record first to satisfy foreign key constraints
        await tx.user.upsert({
          where: { id: userId },
          update: { email, name },
          create: { id: userId, email, name, passwordHash: "" },
        });

        // 2. Create or update membership
        await tx.membership.upsert({
          where: {
            userId_workspaceId: {
              userId,
              workspaceId: invitation.workspaceId,
            },
          },
          update: { role: invitation.role },
          create: {
            userId,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        });

        // 3. Mark invitation as accepted
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        return { success: true, workspaceId: invitation.workspaceId };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to accept invitation.",
      };
    }
  },

  async getTransactionStats(): Promise<import("@/lib/domain/types").TransactionStats> {
    throw new Error("getTransactionStats not implemented in base repository");
  },

  async getPaginatedTransactions(skip: number, take: number): Promise<import("@/lib/domain/types").TransactionRecord[]> {
    throw new Error("getPaginatedTransactions not implemented in base repository");
  },
};

export const prismaRepository = basePrismaRepository;

interface UserContext {
  clerkId: string;
  email: string;
  name: string;
}

export async function createPrismaRepository(
  prisma: PrismaClient,
  context: UserContext,
): Promise<Repository> {

  const { userId, user, workspaceId, workspace } = await resolveUserWorkspace(prisma);

  // 3. Resolve current membership role
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  const userRole = membership?.role || "viewer";

  function isAdmin() {
    return userRole === "owner" || userRole === "admin";
  }

  function requireAdmin() {
    if (!isAdmin()) {
      throw new Error(`Permission denied: Your role (${userRole}) does not allow this action.`);
    }
  }

  // 4. Return a repository instance bound to this specific workspace
  return {
    ...basePrismaRepository,
    getCurrentUser: async () => {
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!dbUser) throw new Error("User not found");
      return toUser(dbUser);
    },
    getWorkspace: async () => toWorkspace(workspace),
    updateWorkspace: async (input) => {
      requireAdmin();
      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          vatRegistered: input.vatRegistered,
          businessType: input.businessType,
          amountTolerance: input.amountTolerance,
          dateToleranceDays: input.dateToleranceDays,
          defaultCurrency: input.defaultCurrency,
          countryProfile: input.countryProfile,
        },
      });
      return toWorkspace(updated);
    },
    getDashboardSnapshot: async () => {
      const [runs, vatRules, glRules, categoryRules, templates] = await Promise.all([
        prisma.reconciliationRun.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { createdAt: "desc" },
          include: summaryRunInclude,
        }),
        prisma.vatRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { taxCode: "asc" } }),
        prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
        prisma.categoryRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
        prisma.mappingTemplate.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }),
      ]);
      const domainVatRules = vatRules.map(toVatRule);
      const domainGlRules = glRules.map(toGlRule);
      const domainCategoryRules = categoryRules.map(toCategoryRule);
      const domainTemplates = templates.map(toTemplate);

      return {
        workspace: toWorkspace(workspace),
        user: toUser(user),
        runs: runs.map((r) =>
          toRunListItem(toSummaryDomainRun(r), domainVatRules, domainGlRules, domainCategoryRules)
        ),
        templates: domainTemplates,
        vatRules: domainVatRules,
        glRules: domainGlRules,
        categoryRules: mergeWorkspaceCategoryRules(domainCategoryRules),
      };
    },
    getRunSummaries: async () => {
      const [runs, vatRules, glRules, categoryRules] = await Promise.all([
        prisma.reconciliationRun.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { createdAt: "desc" },
          include: summaryRunInclude,
        }),
        prisma.vatRule.findMany({ where: { workspaceId: workspace.id } }),
        prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id } }),
        prisma.categoryRule.findMany({ where: { workspaceId: workspace.id } }),
      ]);
      const domainVatRules = vatRules.map(toVatRule);
      const domainGlRules = glRules.map(toGlRule);
      const domainCategoryRules = mergeWorkspaceCategoryRules(categoryRules.map(toCategoryRule));
      return runs.map((run) =>
        toRunListItem(toSummaryDomainRun(run), domainVatRules, domainGlRules, domainCategoryRules),
      );
    },

    importBankStatement: async (input) => {
      requireAdmin();
      return basePrismaRepository.importBankStatement(input);
    },
    deleteBankStatement: async (id) => {
      requireAdmin();
      return basePrismaRepository.deleteBankStatement(id);
    },
    createRun: async (input) => {
      requireAdmin();
      return basePrismaRepository.createRun(input);
    },
    deleteRun: async (runId) => {
      requireAdmin();
      return basePrismaRepository.deleteRun(runId);
    },
    saveReviewMutation: async (input) => {
      requireAdmin();
      return basePrismaRepository.saveReviewMutation(input);
    },
    upsertVatRules: async (input) => {
      requireAdmin();
      return basePrismaRepository.upsertVatRules(input);
    },
    replaceAllVatRules: async (rules) => {
      requireAdmin();
      return basePrismaRepository.replaceAllVatRules(rules);
    },
    upsertGlCodeRules: async (input) => {
      requireAdmin();
      return basePrismaRepository.upsertGlCodeRules(input);
    },
    replaceAllGlCodeRules: async (rules) => {
      requireAdmin();
      return basePrismaRepository.replaceAllGlCodeRules(rules);
    },
    replaceAllCategoryRules: async (input) => {
      requireAdmin();
      return basePrismaRepository.replaceAllCategoryRules(input);
    },
    getUserWorkspaces: async () => {
      const memberships = await prisma.membership.findMany({
        where: { userId },
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      });

      return memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role as import("@/lib/domain/types").WorkspaceRole,
      }));
    },

    getRun: async (runId) => {
      const run = await loadRun(prisma, runId);
      if (!run || run.workspaceId !== workspace.id) return null;
      return toDomainRun(run);
    },
    getRunsWithTransactions: async () => {
      const runs = await prisma.reconciliationRun.findMany({
        where: { workspaceId: workspace.id },
        include: transactionOnlyRunInclude,
        orderBy: { createdAt: "desc" },
      });
      // Map to a partial ReconciliationRun compatible with the transactions page
      return runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status as import("@/lib/domain/types").RunStatus,
        createdAt: run.createdAt.toISOString(),
        period: run.period ?? undefined,
        uploadedFiles: [],
        documents: [],
        matches: [],
        auditTrail: [],
        exports: [],
        transactions: run.transactions.map((tx) => ({
          id: tx.id,
          sourceBankTransactionId: tx.sourceBankTransactionId ?? undefined,
          bankStatementName: tx.sourceBankTransaction?.bankStatement?.name ?? undefined,
          bankStatementId: tx.sourceBankTransaction?.bankStatementId ?? undefined,
          externalId: tx.externalId ?? undefined,
          sourceLineNumber: tx.sourceLineNumber ?? undefined,
          transactionDate: tx.transactionDate?.toISOString().slice(0, 10) ?? undefined,
          postedDate: tx.postedDate?.toISOString().slice(0, 10) ?? undefined,
          amount: tx.amount.toNumber(),
          currency: tx.currency ?? "GBP",
          merchant: tx.merchant ?? "",
          description: tx.description ?? "",
          employee: tx.employee ?? undefined,
          reference: tx.reference ?? undefined,
          vatCode: tx.vatCode ?? undefined,
          glCode: tx.glCode ?? undefined,
          category: tx.category ?? undefined,
          taxTreatment: (tx.taxTreatment ?? undefined) as import("@/lib/domain/types").TaxTreatment | undefined,
          noReceiptRequired: tx.noReceiptRequired ?? undefined,
          taxRate: tx.taxRate ? tx.taxRate.toNumber() : undefined,
          excludedFromExport: tx.excludedFromExport ?? false,
        })),
      }));
    },
    getInvitationByToken: (token: string) => basePrismaRepository.getInvitationByToken(token),
    acceptInvitation: (token: string, userId: string, email: string, name: string) => basePrismaRepository.acceptInvitation(token, userId, email, name),

    getTransactionStats: async () => {
      // Total transactions across all runs
      const runTxPromise = prisma.transaction.count({
        where: { run: { workspaceId: workspace.id } },
      });

      // Total unassigned bank transactions
      const bankTxPromise = prisma.bankTransaction.count({
        where: {
          bankStatement: { workspaceId: workspace.id },
          runTransactions: { none: {} },
        },
      });

      // Categorised counts
      const categorisedRunTxPromise = prisma.transaction.count({
        where: {
          run: { workspaceId: workspace.id },
          category: { not: null },
        },
      });

      const categorisedBankTxPromise = prisma.bankTransaction.count({
        where: {
          bankStatement: { workspaceId: workspace.id },
          runTransactions: { none: {} },
          category: { not: null },
        },
      });

      // Distinct categories used
      const distinctCategoriesPromise = prisma.transaction.groupBy({
        by: ["category"],
        where: {
          run: { workspaceId: workspace.id },
          category: { not: null },
        },
      });

      // Category rule counts for statement types
      const categoryRulesPromise = prisma.categoryRule.findMany({
        where: { workspaceId: workspace.id, isActive: true },
        select: { category: true, statementType: true },
      });

      const [
        runTxCount,
        bankTxCount,
        catRunTxCount,
        catBankTxCount,
        distinctCats,
        categoryRules,
      ] = await Promise.all([
        runTxPromise,
        bankTxPromise,
        categorisedRunTxPromise,
        categorisedBankTxPromise,
        distinctCategoriesPromise,
        categoryRulesPromise,
      ]);

      const totalCount = runTxCount + bankTxCount;
      const categorisedCount = catRunTxCount + catBankTxCount;
      const categoryMap = new Map(categoryRules.map(r => [r.category, r.statementType]));

      // For counts by statement type, we'd ideally use a join or aggregate
      // Since it's a summary, we'll approximate based on transactions if few,
      // but if there are many, we might need a more complex aggregate.
      // For now, let's just use the totals.
      
      return {
        totalCount,
        categorisedCount,
        uncategorisedCount: totalCount - categorisedCount,
        categoryCount: distinctCats.length,
        pnlCount: 0, // Will be refined if needed, but keeping it simple for speed
        balanceSheetCount: 0,
        equityCount: 0,
      };
    },

    getPaginatedTransactions: async (skip, take) => {
      // Combine results from both tables
      // For performance, we first fetch from Transactions (run-assigned)
      // and if we still need more, fetch from BankTransactions (unassigned)
      
      const runTransactions = await prisma.transaction.findMany({
        where: { run: { workspaceId: workspace.id } },
        select: {
          id: true,
          sourceBankTransactionId: true,
          externalId: true,
          sourceLineNumber: true,
          transactionDate: true,
          postedDate: true,
          amount: true,
          currency: true,
          merchant: true,
          description: true,
          employee: true,
          reference: true,
          vatCode: true,
          glCode: true,
          category: true,
          taxTreatment: true,
          taxRate: true,
          noReceiptRequired: true,
          excludedFromExport: true,
          run: { select: { id: true, name: true, period: true } },
          sourceBankTransaction: {
            select: {
              bankStatementId: true,
              bankStatement: { select: { name: true } },
            },
          },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take,
      });

      const results: import("@/lib/domain/types").TransactionRecord[] = runTransactions.map(tx => ({
        id: tx.id,
        sourceBankTransactionId: tx.sourceBankTransactionId ?? undefined,
        bankStatementId: tx.sourceBankTransaction?.bankStatementId ?? undefined,
        bankStatementName: tx.sourceBankTransaction?.bankStatement?.name ?? undefined,
        externalId: tx.externalId ?? undefined,
        sourceLineNumber: tx.sourceLineNumber ?? undefined,
        transactionDate: tx.transactionDate?.toISOString().slice(0, 10) ?? undefined,
        postedDate: tx.postedDate?.toISOString().slice(0, 10) ?? undefined,
        amount: tx.amount.toNumber(),
        currency: tx.currency ?? "GBP",
        merchant: tx.merchant ?? "",
        description: tx.description ?? "",
        employee: tx.employee ?? undefined,
        reference: tx.reference ?? undefined,
        vatCode: tx.vatCode ?? undefined,
        glCode: tx.glCode ?? undefined,
        category: tx.category ?? undefined,
        taxTreatment: (tx.taxTreatment ?? undefined) as import("@/lib/domain/types").TaxTreatment | undefined,
        noReceiptRequired: tx.noReceiptRequired ?? undefined,
        taxRate: tx.taxRate ? tx.taxRate.toNumber() : undefined,
        excludedFromExport: tx.excludedFromExport ?? false,
        runId: tx.run.id,
        runName: tx.run.name,
        period: tx.run.period ?? undefined,
      }));

      if (results.length < take) {
        // Fetch unassigned ones to fill the gap
        const remaining = take - results.length;
        const unassignedSkip = Math.max(0, skip - runTransactions.length); // Approximation if skip was large
        
        const bankTransactions = await prisma.bankTransaction.findMany({
          where: {
            bankStatement: { workspaceId: workspace.id },
            runTransactions: { none: {} },
          },
          select: {
            id: true,
            bankStatementId: true,
            externalId: true,
            sourceLineNumber: true,
            transactionDate: true,
            postedDate: true,
            amount: true,
            currency: true,
            merchant: true,
            description: true,
            employee: true,
            reference: true,
            vatCode: true,
            glCode: true,
            category: true,
            taxTreatment: true,
            taxRate: true,
            noReceiptRequired: true,
            excludedFromExport: true,
            bankStatement: { select: { id: true, name: true } },
          },
          orderBy: { transactionDate: "desc" },
          skip: unassignedSkip,
          take: remaining,
        });

        results.push(...bankTransactions.map(tx => ({
          id: tx.id,
          bankStatementId: tx.bankStatementId,
          bankStatementName: tx.bankStatement.name,
          externalId: tx.externalId ?? undefined,
          sourceLineNumber: tx.sourceLineNumber ?? undefined,
          transactionDate: tx.transactionDate?.toISOString().slice(0, 10) ?? undefined,
          postedDate: tx.postedDate?.toISOString().slice(0, 10) ?? undefined,
          amount: tx.amount.toNumber(),
          currency: tx.currency ?? "GBP",
          merchant: tx.merchant ?? "",
          description: tx.description ?? "",
          employee: tx.employee ?? undefined,
          reference: tx.reference ?? undefined,
          vatCode: tx.vatCode ?? undefined,
          glCode: tx.glCode ?? undefined,
          category: tx.category ?? undefined,
          taxTreatment: (tx.taxTreatment ?? undefined) as import("@/lib/domain/types").TaxTreatment | undefined,
          noReceiptRequired: tx.noReceiptRequired ?? undefined,
          taxRate: tx.taxRate ? tx.taxRate.toNumber() : undefined,
          excludedFromExport: tx.excludedFromExport ?? false,
          runName: tx.bankStatement.name,
          runId: tx.bankStatement.id,
        })));
      }

      return results;
    },
  };
}
