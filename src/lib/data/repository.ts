import type {
  DashboardSnapshot,
  GlCodeRule,
  MappingTemplate,
  ReconciliationRun,
  ReviewActionType,
  ReviewRow,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";

export interface UpsertVatRulesInput {
  rules: VatRule[];
}

export interface UpsertGlCodeRulesInput {
  rules: GlCodeRule[];
}

export interface ReviewMutationInput {
  runId: string;
  rowId: string;
  actionType: ReviewActionType;
  field?: string;
  value?: string;
  note?: string;
  payload?: Record<string, unknown>;
}

export interface ReviewMutationResult {
  linkedDocumentId?: string;
  affectedTransactionIds?: string[];
}

export interface CreateRunInput {
  name: string;
  entity?: string;
  countryProfile?: string;
  defaultCurrency?: string;
  templateId?: string;
  transactionFileName?: string;
}

export interface Repository {
  getCurrentUser(): Promise<User>;
  getWorkspace(): Promise<Workspace>;
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  getRun(runId: string): Promise<ReconciliationRun | null>;
  getRunRows(runId: string): Promise<ReviewRow[]>;
  getTemplates(): Promise<MappingTemplate[]>;
  getVatRules(): Promise<VatRule[]>;
  upsertVatRules(input: UpsertVatRulesInput): Promise<VatRule[]>;
  replaceAllVatRules(rules: VatRule[]): Promise<VatRule[]>;
  upsertGlCodeRules(input: UpsertGlCodeRulesInput): Promise<GlCodeRule[]>;
  replaceAllGlCodeRules(rules: GlCodeRule[]): Promise<GlCodeRule[]>;
  createRun(input: CreateRunInput): Promise<ReconciliationRun>;
  deleteRun(runId: string): Promise<void>;
  updateRun(run: ReconciliationRun): Promise<ReconciliationRun>;
  saveReviewMutation(input: ReviewMutationInput): Promise<ReviewMutationResult>;
}
