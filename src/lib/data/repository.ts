import type {
  DashboardSnapshot,
  MappingTemplate,
  ReconciliationRun,
  ReviewActionType,
  ReviewRow,
  User,
  VatRule,
  Workspace,
} from "@/lib/domain/types";

export interface ReviewMutationInput {
  runId: string;
  rowId: string;
  actionType: ReviewActionType;
  field?: string;
  value?: string;
  note?: string;
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
  createRun(input: CreateRunInput): Promise<ReconciliationRun>;
  updateRun(run: ReconciliationRun): Promise<ReconciliationRun>;
  saveReviewMutation(input: ReviewMutationInput): Promise<void>;
}
