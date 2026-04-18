import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { resolveCategory } from "@/lib/categories/suggester";
import { TransactionsTable } from "@/components/bookkeeping/transactions-table";
import { detectAnomalies } from "@/lib/analytics/anomaly-detector";
import type { AnomalyInfo } from "@/lib/analytics/anomaly-detector";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function BookkeepingTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number(page || "1");
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const repository = await getRepository();
  const [settingsSnapshot, currentUser, stats] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getCurrentUser(),
    repository.getTransactionStats(),
  ]);

  // AI categorisation is restricted to the account set in AI_OWNER_EMAIL
  const aiOwnerEmail = process.env.AI_OWNER_EMAIL?.trim().toLowerCase();
  const canUseAi = Boolean(aiOwnerEmail && currentUser.email.toLowerCase() === aiOwnerEmail);

  // Derive all categories from rules
  const allCategories = settingsSnapshot.categoryRules.map((r) => r.category).sort();

  const pickerCategoryRules = [...settingsSnapshot.categoryRules].sort(
    (a, b) =>
      a.section.localeCompare(b.section) ||
      a.sortOrder - b.sortOrder ||
      a.priority - b.priority ||
      a.category.localeCompare(b.category),
  );

  return (
    <>
      <PageHeader
        eyebrow="Bookkeeping"
        title="Transactions"
        description="All imported transactions across every run. Assign categories to build a clear picture of spending."
      />

      {/* Summary strip - Loaded instantly from DB aggregates */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Total transactions</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{stats.totalCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Categorised</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.categorisedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Uncategorised</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{stats.uncategorisedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Categories</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{stats.categoryCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Load Balanced</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)] italic">Paging enabled for performance</p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <TransactionListWrapper
          skip={skip}
          pageSize={pageSize}
          currentPage={currentPage}
          totalCount={stats.totalCount}
          categoryRules={settingsSnapshot.categoryRules}
          pickerCategoryRules={pickerCategoryRules}
          vatRegistered={settingsSnapshot.workspace.vatRegistered}
          canUseAi={canUseAi}
        />
      </Suspense>
    </>
  );
}

async function TransactionListWrapper({
  skip,
  pageSize,
  currentPage,
  totalCount,
  categoryRules,
  pickerCategoryRules,
  vatRegistered,
  canUseAi,
}: {
  skip: number;
  pageSize: number;
  currentPage: number;
  totalCount: number;
  categoryRules: any[];
  pickerCategoryRules: any[];
  vatRegistered: boolean;
  canUseAi: boolean;
}) {
  const repository = await getRepository();
  const allTransactions = await repository.getPaginatedTransactions(skip, pageSize);

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-10 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No transactions yet. Create a run and import a bank or card statement to get started.
        </p>
      </div>
    );
  }

  // Compute per-merchant anomaly data server-side
  const anomalyMap = detectAnomalies(allTransactions);
  const anomalies: Record<string, AnomalyInfo> = {};
  for (const [id, info] of anomalyMap) {
    anomalies[id] = info;
  }

  return (
    <TransactionsTable
      transactions={allTransactions}
      categoryRules={categoryRules}
      pickerCategoryRules={pickerCategoryRules}
      vatRegistered={vatRegistered}
      canUseAi={canUseAi}
      anomalies={anomalies}
      pagination={{
        currentPage,
        pageSize,
        totalCount,
      }}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <div className="h-12 border-b bg-[var(--color-panel)]" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 border-b p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
