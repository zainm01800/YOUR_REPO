import { demoStore } from "@/lib/demo/demo-store";
import type {
  DashboardSnapshot,
  ReviewRow,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";
import type {
  CreateRunInput,
  Repository,
  ReviewMutationInput,
  ReviewMutationResult,
} from "@/lib/data/repository";
import { applyReviewMutationToRun } from "@/lib/data/review-mutation";
import { deepClone, slugify } from "@/lib/utils";
import { buildReviewRows } from "@/lib/reconciliation/review-rows";
import { buildRunSummary } from "@/lib/reconciliation/summary";

const g = global as typeof global & { __mockStore?: typeof demoStore };
if (!g.__mockStore) {
  g.__mockStore = deepClone(demoStore);
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

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const runs = store.runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      createdAt: run.createdAt,
      processedAt: run.processedAt,
      entity: run.entity,
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

  async createRun(input: CreateRunInput) {
    const run = {
      id: `run_${slugify(input.name)}_${Date.now()}`,
      name: input.name,
      status: "awaiting_mapping" as const,
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
};

export async function getCurrentUser(): Promise<User> {
  return mockRepository.getCurrentUser();
}

export async function getCurrentWorkspace(): Promise<Workspace> {
  return mockRepository.getWorkspace();
}
