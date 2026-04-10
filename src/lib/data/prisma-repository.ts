import { hashSync } from "bcryptjs";
import { Prisma, type PrismaClient } from "@prisma/client";
import { appConfig } from "@/lib/config";
import { demoStore } from "@/lib/demo/demo-store";
import { getPrismaClient } from "@/lib/data/prisma";
import { applyReviewMutationToRun } from "@/lib/data/review-mutation";
import type {
  CreateRunInput,
  Repository,
  ReviewMutationInput,
  ReviewMutationResult,
} from "@/lib/data/repository";
import type {
  DashboardSnapshot,
  ExportRecord,
  ExtractedDocument,
  GlCodeRule,
  MappingTemplate,
  MatchDecision,
  ReconciliationRun,
  ReviewAction,
  ReviewRow,
  TransactionRecord,
  UploadedFileMeta,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

const runInclude = {
  workspace: true,
  uploadedFiles: true,
  transactions: true,
  documents: { include: { taxLines: true } },
  matches: true,
  reviewActions: { include: { actor: true } },
  exports: { include: { actor: true } },
} satisfies Prisma.ReconciliationRunInclude;

type DbRun = Prisma.ReconciliationRunGetPayload<{ include: typeof runInclude }>;

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  return prisma;
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
}): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    defaultCurrency: workspace.defaultCurrency,
    countryProfile: workspace.countryProfile,
    amountTolerance: Number(workspace.amountTolerance),
    dateToleranceDays: workspace.dateToleranceDays,
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

function toUploadedFile(file: {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileKind: string;
}): UploadedFileMeta {
  return {
    id: file.id,
    fileName: file.fileName,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    fileKind: file.fileKind as UploadedFileMeta["fileKind"],
  };
}

function toTransaction(transaction: DbRun["transactions"][number]): TransactionRecord {
  return {
    id: transaction.id,
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
    noReceiptRequired: transaction.noReceiptRequired || undefined,
    excludedFromExport: transaction.excludedFromExport || undefined,
  };
}

function toDocument(document: DbRun["documents"][number]): ExtractedDocument {
  return {
    id: document.id,
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

function toMatch(match: DbRun["matches"][number]): MatchDecision {
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

function toReviewAction(action: DbRun["reviewActions"][number]): ReviewAction {
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

function toExportRecord(record: DbRun["exports"][number]): ExportRecord {
  return {
    id: record.id,
    format: record.format as ExportRecord["format"],
    fileName: record.fileName,
    createdAt: record.createdAt.toISOString(),
  };
}

function toDomainRun(run: DbRun): ReconciliationRun {
  return {
    id: run.id,
    name: run.name,
    status: run.status as ReconciliationRun["status"],
    createdAt: run.createdAt.toISOString(),
    processedAt: toIso(run.processedAt),
    entity: run.entity || undefined,
    countryProfile: run.countryProfile || undefined,
    defaultCurrency: run.workspace.defaultCurrency,
    transactionFileName: run.transactionFileName || undefined,
    uploadedFiles: run.uploadedFiles.map(toUploadedFile),
    transactions: run.transactions.map(toTransaction),
    documents: run.documents.map(toDocument),
    matches: run.matches.map(toMatch),
    auditTrail: run.reviewActions.map(toReviewAction),
    exports: run.exports.map(toExportRecord),
  };
}

async function ensureBootstrap(prisma: PrismaClient) {
  const workspace = await prisma.workspace.upsert({
    where: { slug: appConfig.workspaceSlug },
    update: {
      name: demoStore.workspace.name,
      defaultCurrency: demoStore.workspace.defaultCurrency,
      countryProfile: demoStore.workspace.countryProfile,
      amountTolerance: demoStore.workspace.amountTolerance,
      dateToleranceDays: demoStore.workspace.dateToleranceDays,
    },
    create: {
      id: demoStore.workspace.id,
      name: demoStore.workspace.name,
      slug: demoStore.workspace.slug,
      defaultCurrency: demoStore.workspace.defaultCurrency,
      countryProfile: demoStore.workspace.countryProfile,
      amountTolerance: demoStore.workspace.amountTolerance,
      dateToleranceDays: demoStore.workspace.dateToleranceDays,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: appConfig.demoCredentials.email },
    update: {
      name: demoStore.user.name,
    },
    create: {
      id: demoStore.user.id,
      email: appConfig.demoCredentials.email,
      name: demoStore.user.name,
      passwordHash: hashSync(appConfig.demoCredentials.password, 10),
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
    },
  });

  if ((await prisma.vatRule.count({ where: { workspaceId: workspace.id } })) === 0) {
    await prisma.vatRule.createMany({
      data: demoStore.vatRules.map((rule) => ({
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

  if ((await prisma.glCodeRule.count({ where: { workspaceId: workspace.id } })) === 0) {
    await prisma.glCodeRule.createMany({
      data: demoStore.glRules.map((rule) => ({
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

  if ((await prisma.mappingTemplate.count({ where: { workspaceId: workspace.id } })) === 0) {
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

  return { workspace, user };
}

async function loadRun(prisma: PrismaClient, runId: string) {
  return prisma.reconciliationRun.findUnique({
    where: { id: runId },
    include: {
      ...runInclude,
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
        countryProfile: run.countryProfile,
        processedAt: toDate(run.processedAt),
        transactionFileName: run.transactionFileName,
        notes: undefined,
        workspaceId,
      },
      create: {
        id: run.id,
        name: run.name,
        status: run.status,
        entity: run.entity,
        countryProfile: run.countryProfile,
        createdAt: new Date(run.createdAt),
        processedAt: toDate(run.processedAt),
        transactionFileName: run.transactionFileName,
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

export const prismaRepository: Repository = {
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

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const prisma = requirePrisma();
    const { workspace, user } = await ensureBootstrap(prisma);
    const [runs, templates, vatRules, glRules] = await Promise.all([
      prisma.reconciliationRun.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        include: {
          ...runInclude,
          workspace: true,
        },
      }),
      prisma.mappingTemplate.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { taxCode: "asc" } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id }, orderBy: { priority: "asc" } }),
    ]);

    const domainRuns = runs.map(toDomainRun);

    return {
      workspace: toWorkspace(workspace),
      user: toUser(user),
      runs: domainRuns.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        createdAt: run.createdAt,
        processedAt: run.processedAt,
        entity: run.entity,
        summary: buildRunSummary(buildReviewRows(run, vatRules.map(toVatRule), glRules.map(toGlRule))),
      })),
      templates: templates.map(toTemplate),
      vatRules: vatRules.map(toVatRule),
      glRules: glRules.map(toGlRule),
    };
  },

  async getRun(runId) {
    const prisma = requirePrisma();
    await ensureBootstrap(prisma);
    const run = await loadRun(prisma, runId);
    return run ? toDomainRun(run) : null;
  },

  async getRunRows(runId): Promise<ReviewRow[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const [run, vatRules, glRules] = await Promise.all([
      loadRun(prisma, runId),
      prisma.vatRule.findMany({ where: { workspaceId: workspace.id } }),
      prisma.glCodeRule.findMany({ where: { workspaceId: workspace.id } }),
    ]);

    if (!run) {
      throw new Error(`Run ${runId} was not found.`);
    }

    return buildReviewRows(toDomainRun(run), vatRules.map(toVatRule), glRules.map(toGlRule));
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

  async getVatRules(): Promise<VatRule[]> {
    const prisma = requirePrisma();
    const { workspace } = await ensureBootstrap(prisma);
    const rules = await prisma.vatRule.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { taxCode: "asc" },
    });
    return rules.map(toVatRule);
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
        countryProfile: input.countryProfile || workspace.countryProfile,
        transactionFileName: input.transactionFileName,
        workspaceId: workspace.id,
      },
      include: {
        ...runInclude,
        workspace: true,
      },
    });

    const domainRun = toDomainRun(created);
    domainRun.defaultCurrency = input.defaultCurrency || workspace.defaultCurrency;
    domainRun.countryProfile = input.countryProfile || workspace.countryProfile;
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
};
