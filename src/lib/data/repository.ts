import type {
  BankStatement,
  BankStatementSummary,
  CategoryRule,
  CategoryBudget,
  Client,
  CreateClientInput,
  CreateInvoiceInput,
  CreateManualExpenseInput,
  DashboardSnapshot,
  GlCodeRule,
  BankSourceMode,
  Invoice,
  ManualExpense,
  MappingTemplate,
  ReconciliationRun,
  RunListItem,
  ReviewActionType,
  ReviewRow,
  SettingsSnapshot,
  TransactionRecord,
  User,
  VatRule,
  Workspace,
  Invitation,
  TransactionStats,
} from "@/lib/domain/types";

export interface UpsertVatRulesInput {
  rules: VatRule[];
}

export interface UpsertGlCodeRulesInput {
  rules: GlCodeRule[];
}

export interface ReplaceCategoryRulesInput {
  rules: CategoryRule[];
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
  period?: string;
  countryProfile?: string;
  defaultCurrency?: string;
  templateId?: string;
  transactionFileName?: string;
  bankStatementId?: string;
  bankSourceMode?: BankSourceMode;
  bankSourceLabel?: string;
}

export interface ImportBankStatementInput {
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  headers: string[];
  columnMappings: Record<string, string>;
  defaultCurrency?: string;
  transactions: TransactionRecord[];
}

export interface AttachBankSourceInput {
  runId: string;
  bankSourceMode: BankSourceMode;
  bankStatementId?: string;
}

export interface UpdateWorkspaceInput {
  vatRegistered?: boolean;
  businessType?: Workspace["businessType"];
  amountTolerance?: number;
  dateToleranceDays?: number;
  defaultCurrency?: string;
  countryProfile?: string;
}

export interface Repository {
  getCurrentUser(): Promise<User>;
  getWorkspace(): Promise<Workspace>;
  updateWorkspace(input: UpdateWorkspaceInput): Promise<Workspace>;
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  getSettingsSnapshot(): Promise<SettingsSnapshot>;
  getRunSummaries(): Promise<RunListItem[]>;
  getRun(runId: string): Promise<ReconciliationRun | null>;
  getRunsWithTransactions(): Promise<ReconciliationRun[]>;
  getRunRows(runId: string): Promise<ReviewRow[]>;
  getUnassignedBankTransactions(): Promise<TransactionRecord[]>;
  getTemplates(): Promise<MappingTemplate[]>;
  getBankStatementSummaries(): Promise<BankStatementSummary[]>;
  getBankStatements(): Promise<BankStatement[]>;
  getBankStatement(statementId: string): Promise<BankStatement | null>;
  importBankStatement(input: ImportBankStatementInput): Promise<BankStatement>;
  deleteBankStatement(id: string): Promise<void>;
  attachBankSourceToRun(input: AttachBankSourceInput): Promise<ReconciliationRun>;
  getVatRules(): Promise<VatRule[]>;
  upsertVatRules(input: UpsertVatRulesInput): Promise<VatRule[]>;
  replaceAllVatRules(rules: VatRule[]): Promise<VatRule[]>;
  upsertGlCodeRules(input: UpsertGlCodeRulesInput): Promise<GlCodeRule[]>;
  replaceAllGlCodeRules(rules: GlCodeRule[]): Promise<GlCodeRule[]>;
  getCategoryRules(): Promise<CategoryRule[]>;
  replaceAllCategoryRules(input: ReplaceCategoryRulesInput): Promise<CategoryRule[]>;
  setTransactionCategory(transactionId: string, category: string | null, reason?: string, confidenceScore?: number): Promise<void>;
  setTransactionAllowable(transactionId: string, allowable: boolean | null): Promise<void>;
  deleteTransactions(ids: string[]): Promise<void>;
  createRun(input: CreateRunInput): Promise<ReconciliationRun>;
  deleteRun(runId: string): Promise<void>;
  updateRun(run: ReconciliationRun): Promise<ReconciliationRun>;
  saveReviewMutation(input: ReviewMutationInput): Promise<ReviewMutationResult>;
  getUserWorkspaces(): Promise<Array<{ id: string; name: string; slug: string; role: string }>>;
  getInvitationByToken(token: string): Promise<Invitation | null>;
  acceptInvitation(token: string, userId: string, email: string, name: string): Promise<{ success: boolean; error?: string; workspaceId?: string }>;
  getTransactionStats(): Promise<TransactionStats>;
  getPaginatedTransactions(skip: number, take: number): Promise<TransactionRecord[]>;
  // ─── Clients ───────────────────────────────────────────────────────────────
  getClients(): Promise<Client[]>;
  getClient(clientId: string): Promise<Client | null>;
  createClient(input: CreateClientInput): Promise<Client>;
  updateClient(clientId: string, input: Partial<CreateClientInput>): Promise<Client>;
  deleteClient(clientId: string): Promise<void>;
  // ─── Invoices ──────────────────────────────────────────────────────────────
  getInvoices(): Promise<Invoice[]>;
  getInvoice(invoiceId: string): Promise<Invoice | null>;
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
  updateInvoice(invoiceId: string, input: Partial<CreateInvoiceInput> & { dueDate?: string | null; status?: string; paidAt?: string | null; paidAmount?: number | null }): Promise<Invoice>;
  deleteInvoice(invoiceId: string): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;
  // ─── Manual Expenses ───────────────────────────────────────────────────────
  getManualExpenses(): Promise<ManualExpense[]>;
  createManualExpense(input: CreateManualExpenseInput): Promise<ManualExpense>;
  updateManualExpense(expenseId: string, input: Partial<CreateManualExpenseInput>): Promise<ManualExpense>;
  deleteManualExpense(expenseId: string): Promise<void>;
  // ─── Budgets ───────────────────────────────────────────────────────────────
  getCategoryBudgets(): Promise<CategoryBudget[]>;
  upsertCategoryBudget(category: string, amount: number, period: "monthly" | "annual"): Promise<CategoryBudget>;
  deleteCategoryBudget(budgetId: string): Promise<void>;
}
