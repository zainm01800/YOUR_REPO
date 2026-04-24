import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { TransactionsTable } from "@/components/bookkeeping/transactions-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { categorySectionSort } from "@/lib/categories/sections";

export default async function BookkeepingTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const rawPage = parseInt(page ?? "1", 10);
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  try {
    const repository = await getRepository();
    const [settingsSnapshot, currentUser, stats] = await Promise.all([
      repository.getSettingsSnapshot(),
      repository.getCurrentUser(),
      repository.getTransactionStats().catch((err: unknown) => {
        console.error("[transactions/page] getTransactionStats failed:", err);
        return {
          totalCount: 0,
          categorisedCount: 0,
          uncategorisedCount: 0,
          categoryCount: 0,
          pnlCount: 0,
          balanceSheetCount: 0,
          equityCount: 0,
          totalIn: 0,
          totalOut: 0,
        };
      }),
    ]);

    const aiOwnerEmail = process.env.AI_OWNER_EMAIL?.trim().toLowerCase();
    const canUseAi = Boolean(aiOwnerEmail && currentUser.email.toLowerCase() === aiOwnerEmail);

    const pickerCategoryRules = [...settingsSnapshot.categoryRules].sort(
      categorySectionSort,
    );

    return (
      <>
        <PageHeader
          eyebrow="Review"
          title="Transactions"
          description="Every line from every statement, categorised."
        />

        <Suspense fallback={<TableSkeleton />}>
          <TransactionListWrapper
            skip={skip}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={stats.totalCount}
            totalIn={stats.totalIn}
            totalOut={stats.totalOut}
            categoryRules={settingsSnapshot.categoryRules}
            pickerCategoryRules={pickerCategoryRules}
            vatRegistered={settingsSnapshot.workspace.vatRegistered}
            canUseAi={canUseAi}
          />
        </Suspense>
      </>
    );
  } catch (err: any) {
    console.error("[transactions/page] Critical render error:", err);
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Failed to load transactions</h2>
        <p className="mt-2 text-sm text-gray-600">{(err as Error).message || "An unexpected error occurred during rendering."}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-white text-sm"
        >
          Retry
        </button>
      </div>
    );
  }
}

async function TransactionListWrapper({
  skip,
  pageSize,
  currentPage,
  totalCount,
  totalIn,
  totalOut,
  categoryRules,
  pickerCategoryRules,
  vatRegistered,
  canUseAi,
}: {
  skip: number;
  pageSize: number;
  currentPage: number;
  totalCount: number;
  totalIn: number;
  totalOut: number;
  categoryRules: any[];
  pickerCategoryRules: any[];
  vatRegistered: boolean;
  canUseAi: boolean;
}) {
  const repository = await getRepository();
  const allTransactions = await repository.getPaginatedTransactions(skip, pageSize).catch((err) => {
    console.error("[transactions page] getPaginatedTransactions failed:", err);
    return [];
  });

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-12 text-center">
        <p className="text-sm font-medium text-[var(--color-foreground)]">No transactions yet</p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Create a run and import a bank or card statement to get started.
        </p>
      </div>
    );
  }

  return (
    <TransactionsTable
      transactions={allTransactions}
      categoryRules={categoryRules}
      pickerCategoryRules={pickerCategoryRules}
      vatRegistered={vatRegistered}
      canUseAi={canUseAi}
      totalIn={totalIn}
      totalOut={totalOut}
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
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <div className="h-12 border-b bg-[var(--color-panel)]" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 border-b p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
