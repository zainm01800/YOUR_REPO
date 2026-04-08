import { demoStore } from "@/lib/demo/demo-store";
import type {
  DashboardSnapshot,
  ReconciliationRun,
  ReviewAction,
  ReviewRow,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";
import type {
  CreateRunInput,
  Repository,
  ReviewMutationInput,
} from "@/lib/data/repository";
import { deepClone, slugify } from "@/lib/utils";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

const store = deepClone(demoStore);

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

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const runs = store.runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      createdAt: run.createdAt,
      processedAt: run.processedAt,
      summary: buildRunSummary(
        buildReviewRows(run, store.vatRules, store.glRules),
      ),
    }));

    return {
      workspace: deepClone(store.workspace),
      user: deepClone(store.user),
      runs,
      templates: deepClone(store.templates),
      vatRules: deepClone(store.vatRules),
      glRules: deepClone(store.glRules),
    };
  },

  async getRun(runId) {
    const run = store.runs.find((candidate) => candidate.id === runId);
    return run ? deepClone(run) : null;
  },

  async getRunRows(runId): Promise<ReviewRow[]> {
    const run = getRunOrThrow(runId);
    return buildReviewRows(run, store.vatRules, store.glRules);
  },

  async getTemplates() {
    return deepClone(store.templates);
  },

  async getVatRules(): Promise<VatRule[]> {
    return deepClone(store.vatRules);
  },

  async createRun(input: CreateRunInput): Promise<ReconciliationRun> {
    const run: ReconciliationRun = {
      id: `run_${slugify(input.name)}_${Date.now()}`,
      name: input.name,
      status: "awaiting_mapping",
      createdAt: new Date().toISOString(),
      entity: input.entity,
      countryProfile: input.countryProfile || store.workspace.countryProfile,
      defaultCurrency: input.defaultCurrency || store.workspace.defaultCurrency,
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

  async updateRun(run) {
    const index = store.runs.findIndex((candidate) => candidate.id === run.id);

    if (index === -1) {
      throw new Error(`Run ${run.id} was not found.`);
    }

    store.runs[index] = deepClone(run);
    return deepClone(run);
  },

  async saveReviewMutation(input: ReviewMutationInput) {
    const run = getRunOrThrow(input.runId);
    const transaction = run.transactions.find(
      (candidate) => `row_${candidate.id}` === input.rowId,
    );

    if (transaction && input.actionType === "override_gl_code" && input.value) {
      transaction.glCode = input.value;
    }

    if (transaction && input.actionType === "override_vat_code" && input.value) {
      transaction.vatCode = input.value;
    }

    if (transaction && input.actionType === "exclude_from_export") {
      transaction.excludedFromExport = true;
    }

    if (transaction && input.actionType === "no_receipt_required") {
      transaction.noReceiptRequired = true;
    }

    const action: ReviewAction = {
      id: `audit_${Date.now()}`,
      runId: run.id,
      actionType: input.actionType,
      field:
        input.actionType === "override_gl_code"
          ? "glCode"
          : input.actionType === "override_vat_code"
            ? "vatCode"
            : undefined,
      afterValue: input.value,
      note: input.note,
      createdAt: new Date().toISOString(),
      actorName: store.user.name,
    };

    run.auditTrail.unshift(action);
  },
};

export async function getCurrentUser(): Promise<User> {
  return mockRepository.getCurrentUser();
}

export async function getCurrentWorkspace(): Promise<Workspace> {
  return mockRepository.getWorkspace();
}
