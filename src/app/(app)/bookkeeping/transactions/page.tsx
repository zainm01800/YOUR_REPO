import { PageHeader } from "@/components/app-shell/page-header";
import { getRepository } from "@/lib/data";
import { TransactionsTable } from "@/components/bookkeeping/transactions-table";
import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

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

  const repository = await getRepository();
  const [settingsSnapshot, currentUser, stats] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getCurrentUser(),
    repository.getTransactionStats(),
  ]);

  const aiOwnerEmail = process.env.AI_OWNER_EMAIL?.trim().toLowerCase();
  const canUseAi = Boolean(aiOwnerEmail && currentUser.email.toLowerCase() === aiOwnerEmail);

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
        eyebrow="Review"
        title="Transactions"
        description="Every line from every statement, categorised."
      />

      <div className="flex w-fit items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--color-panel)] p-1">
        {[
          { label: "Bank transactions", href: "/bookkeeping/transactions", active: true },
          { label: "Expense claims", href: "/expenses?tab=expenses", active: false },
          { label: "Mileage claims", href: "/expenses?tab=mileage", active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              tab.active
                ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

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
  const allTransactions = await repository.getPaginatedTransactions(skip, pageSize);

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
