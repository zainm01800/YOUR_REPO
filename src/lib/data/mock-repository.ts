import { demoStore } from "@/lib/demo/demo-store";
import type {
  BankStatement,
  BankStatementSummary,
  CategoryRule,
  DashboardSnapshot,
  GlCodeRule,
  RunListItem,
  ReviewRow,
  SettingsSnapshot,
  TransactionRecord,
  User,
  VatRule,
  Workspace,
  Invitation,
} from "@/lib/domain/types";
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
import {
  cloneBankTransactionsForRun,
  decorateBankStatementsWithStatuses,
  deriveStatementMetadata,
  pickTransactionsForBankSource,
} from "@/lib/bank-statements/service";
import { applyReviewMutationToRun } from "@/lib/data/review-mutation";
import { deepClone, slugify } from "@/lib/utils";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

// Bump STORE_VERSION whenever demoStore shape changes to force a reset.
const STORE_VERSION = 6;
const g = global as typeof global & { __mockStore?: typeof demoStore; __mockStoreVersion?: number };
if (!g.__mockStore || g.__mockStoreVersion !== STORE_VERSION) {
  g.__mockStore = deepClone(demoStore);
  g.__mockStoreVersion = STORE_VERSION;
}
const store = g.__mockStore;

function getRunOrThrow(runId: string) {
  const run = store.runs.find((candidate) => candidate.id === runId);

  if (!run) {
    throw new Error(`Run ${runId} was not found.`);
  }

  return run;
}

export const mockRepository: Repository = {
  async getCurrentUser() {
    return deepClone(store.user);
  },

  async getWorkspace() {
    return deepClone(store.workspace);
  },

  async updateWorkspace(input: UpdateWorkspaceInput) {
    if (input.vatRegistered !== undefined) store.workspace.vatRegistered = input.vatRegistered;
    if (input.businessType !== undefined) store.workspace.businessType = input.businessType;
    if (input.amountTolerance !== undefined) store.workspace.amountTolerance = input.amountTolerance;
    if (input.dateToleranceDays !== undefined) store.workspace.dateToleranceDays = input.dateToleranceDays;
    if (input.defaultCurrency !== undefined) store.workspace.defaultCurrency = input.defaultCurrency;
    if (input.countryProfile !== undefined) store.workspace.countryProfile = input.countryProfile;
    return deepClone(store.workspace);
  },

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const runs: RunListItem[] = store.runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      createdAt: run.createdAt,
      processedAt: run.processedAt,
      entity: run.entity,
      period: run.period,
      locked: run.locked,
      summary: buildRunSummary(
        buildReviewRows(run, store.vatRules, store.glRules, store.categoryRules),
      ),
    }));

    return {
      workspace: deepClone(store.workspace),
      user: deepClone(store.user),
      runs,
      templates: deepClone(store.templates),
      vatRules: deepClone(store.vatRules),
      glRules: deepClone(store.glRules),
      categoryRules: deepClone(store.categoryRules),
    };
  },

  async getSettingsSnapshot(): Promise<SettingsSnapshot> {
    return {
      workspace: deepClone(store.workspace),
      templates: deepClone(store.templates),
      vatRules: deepClone(store.vatRules),
      glRules: deepClone(store.glRules),
      categoryRules: deepClone(store.categoryRules),
      memberships: [
        {
          id: "m_1",
          userId: store.user.id,
          userName: store.user.name,
          userEmail: store.user.email,
          role: "owner",
          createdAt: new Date().toISOString(),
        },
      ],
      invitations: [],
    };
  },

  async getRunSummaries(): Promise<RunListItem[]> {
    return store.runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      createdAt: run.createdAt,
      processedAt: run.processedAt,
      entity: run.entity,
      period: run.period,
      locked: run.locked,
      summary: buildRunSummary(
        buildReviewRows(run, store.vatRules, store.glRules, store.categoryRules),
      ),
    }));
  },

  async getRun(runId) {
    const run = store.runs.find((candidate) => candidate.id === runId);
    return run ? deepClone(run) : null;
  },

  async getRunsWithTransactions() {
    return deepClone(store.runs);
  },

  async getRunRows(runId): Promise<ReviewRow[]> {
    const run = getRunOrThrow(runId);
    return buildReviewRows(run, store.vatRules, store.glRules, store.categoryRules);
  },

  async getUnassignedBankTransactions(): Promise<TransactionRecord[]> {
    const usedSourceIds = new Set(
      store.runs.flatMap((run) =>
        run.transactions
          .map((transaction) => transaction.sourceBankTransactionId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return store.bankStatements.flatMap((statement) =>
      statement.transactions
        .filter((transaction) => !usedSourceIds.has(transaction.id))
        .map((transaction) => ({
          ...transaction,
          bankStatementId: statement.id,
          bankStatementName: statement.name,
        })),
    );
  },

  async getTemplates() {
    return deepClone(store.templates);
  },

  async getBankStatementSummaries(): Promise<BankStatementSummary[]> {
    return store.bankStatements.map((statement) => ({
      id: statement.id,
      name: statement.name,
      fileName: statement.fileName,
      bankName: statement.bankName,
      accountName: statement.accountName,
      currency: statement.currency,
      importedAt: statement.importedAt,
      importStatus: statement.importStatus,
      dateRangeStart: statement.dateRangeStart,
      dateRangeEnd: statement.dateRangeEnd,
      transactionCount: statement.transactions.length,
    }));
  },

  async getBankStatements(): Promise<BankStatement[]> {
    return decorateBankStatementsWithStatuses(
      deepClone(store.bankStatements),
      deepClone(store.runs),
    );
  },

  async getBankStatement(statementId: string): Promise<BankStatement | null> {
    const statements = decorateBankStatementsWithStatuses(
      deepClone(store.bankStatements),
      deepClone(store.runs),
    );
    return statements.find((statement) => statement.id === statementId) ?? null;
  },

  async deleteBankStatement(id: string): Promise<void> {
    const index = store.bankStatements.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Bank statement ${id} was not found.`);
    const sourceTransactionIds = new Set(
      store.bankStatements[index].transactions.map((transaction) => transaction.id),
    );
    for (const run of store.runs) {
      if (run.bankStatementId === id) {
        run.bankStatementId = undefined;
        run.bankSourceMode = "later";
        run.bankSourceLabel = undefined;
      }
      run.transactions = run.transactions.filter(
        (tx) =>
          tx.bankStatementId !== id &&
          (!tx.sourceBankTransactionId || !sourceTransactionIds.has(tx.sourceBankTransactionId)),
      );
      run.matches = run.matches.filter((match) =>
        run.transactions.some((tx) => tx.id === match.transactionId),
      );
    }
    store.bankStatements.splice(index, 1);
  },

  async importBankStatement(input: ImportBankStatementInput): Promise<BankStatement> {
    const metadata = deriveStatementMetadata(
      input.fileName,
      input.transactions,
      input.defaultCurrency,
    );
    const statementId = `stmt_${slugify(input.name)}_${Date.now()}`;
    const statement: BankStatement = {
      id: statementId,
      name: input.name,
      fileName: input.fileName,
      bankName: metadata.bankName,
      accountName: metadata.accountName,
      currency: metadata.currency,
      importedAt: new Date().toISOString(),
      importStatus: "imported",
      dateRangeStart: metadata.dateRangeStart,
      dateRangeEnd: metadata.dateRangeEnd,
      transactionCount: input.transactions.length,
      previewHeaders: input.headers,
      savedColumnMappings: input.columnMappings,
      transactions: input.transactions.map((transaction, index) => ({
        ...transaction,
        id: `bank_txn_${statementId}_${index + 1}`,
        bankStatementId: statementId,
        reconciliationStatus: "unreconciled",
      })),
    };

    store.bankStatements.unshift(statement);
    return statement;
  },

  async attachBankSourceToRun(input: AttachBankSourceInput) {
    const run = getRunOrThrow(input.runId);

    if (input.bankSourceMode === "skip" || input.bankSourceMode === "later" || input.bankSourceMode === "ocr_only") {
      run.bankSourceMode = input.bankSourceMode;
      run.bankStatementId = undefined;
      run.bankSourceLabel = input.bankSourceMode === "ocr_only" ? "Standalone OCR Extraction" : undefined;
      return deepClone(run);
    }

    const picked = pickTransactionsForBankSource(
      deepClone(store.bankStatements),
      deepClone(store.runs.filter((candidate) => candidate.id !== run.id)),
      input.bankSourceMode,
      input.bankStatementId,
    );

    run.bankSourceMode = input.bankSourceMode;
    run.bankStatementId = picked.statement?.id;
    run.bankSourceLabel = picked.label;
    run.transactionFileName = picked.statement?.fileName ?? run.transactionFileName;
    run.transactions = picked.statement
      ? cloneBankTransactionsForRun(picked.statement, picked.transactions)
      : picked.transactions.map((transaction, index) => ({
          ...transaction,
          id: `txn_run_pool_${slugify(transaction.reference || transaction.description || String(index + 1))}_${Date.now()}_${index + 1}`,
          sourceBankTransactionId: transaction.id,
          bankStatementId: transaction.bankStatementId,
          bankStatementName: store.bankStatements.find((statement) => statement.id === transaction.bankStatementId)?.name,
        }));

    return deepClone(run);
  },

  async getVatRules(): Promise<VatRule[]> {
    return deepClone(store.vatRules);
  },

  async upsertVatRules(input: UpsertVatRulesInput): Promise<VatRule[]> {
    const countryCodes = [...new Set(input.rules.map((rule) => rule.countryCode))];
    store.vatRules = [
      ...store.vatRules.filter((rule) => !countryCodes.includes(rule.countryCode)),
      ...deepClone(input.rules),
    ].sort((left, right) => {
      if (left.countryCode === right.countryCode) {
        return left.rate - right.rate;
      }

      return left.countryCode.localeCompare(right.countryCode);
    });

    return deepClone(store.vatRules);
  },

  async replaceAllVatRules(rules: VatRule[]): Promise<VatRule[]> {
    store.vatRules = deepClone(rules).sort((a, b) => {
      if (a.countryCode === b.countryCode) return a.rate - b.rate;
      return a.countryCode.localeCompare(b.countryCode);
    });
    return deepClone(store.vatRules);
  },

  async upsertGlCodeRules(input: UpsertGlCodeRulesInput): Promise<GlCodeRule[]> {
    const incomingCodes = [...new Set(input.rules.map((rule) => rule.glCode))];
    store.glRules = [
      ...store.glRules.filter((rule) => !incomingCodes.includes(rule.glCode)),
      ...deepClone(input.rules),
    ].sort((left, right) => {
      if (left.priority === right.priority) {
        return left.glCode.localeCompare(right.glCode);
      }

      return left.priority - right.priority;
    });

    return deepClone(store.glRules);
  },

  async replaceAllGlCodeRules(rules: GlCodeRule[]): Promise<GlCodeRule[]> {
    store.glRules = deepClone(rules).sort((left, right) => {
      if (left.priority === right.priority) {
        return left.glCode.localeCompare(right.glCode);
      }

      return left.priority - right.priority;
    });

    return deepClone(store.glRules);
  },

  async getCategoryRules(): Promise<CategoryRule[]> {
    return deepClone(store.categoryRules).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority || a.category.localeCompare(b.category),
    );
  },

  async replaceAllCategoryRules(input: ReplaceCategoryRulesInput): Promise<CategoryRule[]> {
    store.categoryRules = deepClone(input.rules).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.priority - b.priority || a.category.localeCompare(b.category),
    );
    return deepClone(store.categoryRules);
  },

  async setTransactionCategory(transactionId: string, category: string | null): Promise<void> {
    for (const run of store.runs) {
      const tx = run.transactions.find((t) => t.id === transactionId);
      if (tx) {
        if (category === null) {
          delete tx.category;
        } else {
          tx.category = category;
        }
        return;
      }
    }
    throw new Error(`Transaction ${transactionId} was not found.`);
  },

  async setTransactionAllowable(transactionId: string, allowable: boolean): Promise<void> {
    for (const run of store.runs) {
      const tx = run.transactions.find((t) => t.id === transactionId);
      if (tx) {
        tx.noReceiptRequired = !allowable;
        return;
      }
    }

    for (const statement of store.bankStatements) {
      const tx = statement.transactions.find((t) => t.id === transactionId);
      if (tx) {
        tx.noReceiptRequired = !allowable;
        return;
      }
    }

    throw new Error(`Transaction ${transactionId} was not found.`);
  },

  async deleteTransactions(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const sourceBankTransactionIds = new Set<string>();

    for (const run of store.runs) {
      for (const transaction of run.transactions) {
        if (idSet.has(transaction.id) && transaction.sourceBankTransactionId) {
          sourceBankTransactionIds.add(transaction.sourceBankTransactionId);
        }
      }
    }

    for (const statement of store.bankStatements) {
      for (const transaction of statement.transactions) {
        if (idSet.has(transaction.id)) {
          sourceBankTransactionIds.add(transaction.id);
        }
      }
    }

    for (const run of store.runs) {
      run.transactions = run.transactions.filter(
        (t) => !idSet.has(t.id) && (!t.sourceBankTransactionId || !sourceBankTransactionIds.has(t.sourceBankTransactionId)),
      );
      run.matches = run.matches.filter((match) =>
        run.transactions.some((tx) => tx.id === match.transactionId),
      );
    }
    for (const statement of store.bankStatements) {
      statement.transactions = statement.transactions.filter(
        (t) => !idSet.has(t.id) && !sourceBankTransactionIds.has(t.id),
      );
    }
  },

  async createRun(input: CreateRunInput) {
    const run = {
      id: `run_${slugify(input.name)}_${Date.now()}`,
      name: input.name,
      status: "awaiting_mapping" as const,
      createdAt: new Date().toISOString(),
      entity: input.entity,
      period: input.period,
      countryProfile: input.countryProfile || store.workspace.countryProfile,
      defaultCurrency: input.defaultCurrency || store.workspace.defaultCurrency,
      bankStatementId: input.bankStatementId,
      bankSourceMode: input.bankSourceMode,
      bankSourceLabel: input.bankSourceLabel,
      transactionFileName: input.transactionFileName,
      previewHeaders: ["Date", "Amount", "Merchant", "Description", "Currency"],
      savedColumnMappings:
        store.templates.find((template) => template.id === input.templateId)
          ?.columnMappings || undefined,
      uploadedFiles: [],
      transactions: [],
      documents: [],
      matches: [],
      auditTrail: [],
      exports: [],
    };

    store.runs.unshift(run);
    return deepClone(run);
  },

  async deleteRun(runId: string): Promise<void> {
    const index = store.runs.findIndex((candidate) => candidate.id === runId);

    if (index === -1) {
      throw new Error(`Run ${runId} was not found.`);
    }

    store.runs.splice(index, 1);
  },

  async updateRun(run) {
    const index = store.runs.findIndex((candidate) => candidate.id === run.id);

    if (index === -1) {
      throw new Error(`Run ${run.id} was not found.`);
    }

    store.runs[index] = deepClone(run);
    return deepClone(run);
  },

  async saveReviewMutation(input: ReviewMutationInput): Promise<ReviewMutationResult> {
    const run = getRunOrThrow(input.runId);
    return applyReviewMutationToRun(run, input, store.user.name);
  },

  async getUserWorkspaces() {
    return [
      {
        id: store.workspace.id,
        name: store.workspace.name,
        slug: store.workspace.slug,
        role: "owner",
      },
    ];
  },
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return null;
  },
  async acceptInvitation(token: string, userId: string, email: string, name: string): Promise<{ success: boolean; error?: string; workspaceId?: string }> {
    return { success: true, workspaceId: "ws_mock" };
  },

  async getTransactionStats() {
    const allTxs = store.bankStatements.flatMap(s => s.transactions);
    const runTxs = store.runs.flatMap(r => r.transactions);
    const totalCount = allTxs.length + runTxs.length;
    
    return {
      totalCount,
      categorisedCount: runTxs.length,
      uncategorisedCount: allTxs.length,
      categoryCount: new Set(runTxs.map(tx => tx.category)).size,
      pnlCount: 0,
      balanceSheetCount: 0,
      equityCount: 0,
    };
  },

  async getPaginatedTransactions(skip: number, take: number) {
    const runTxs = store.runs.flatMap(run => 
      run.transactions.map(tx => ({
        ...tx,
        runId: run.id,
        runName: run.name,
        period: run.period,
      }))
    );

    const bankTxs = store.bankStatements.flatMap(s => 
      s.transactions.map(tx => ({
        ...tx,
        runId: s.id,
        runName: s.name,
      }))
    );

    const all = [...runTxs, ...bankTxs].sort((a, b) => 
      (b.transactionDate || "").localeCompare(a.transactionDate || "")
    );

    return all.slice(skip, skip + take);
  },
};

export async function getCurrentUser(): Promise<User> {
  return mockRepository.getCurrentUser();
}

export async function getCurrentWorkspace(): Promise<Workspace> {
  return mockRepository.getWorkspace();
}
