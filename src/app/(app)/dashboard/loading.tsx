import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-[480px]" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Runs table + sidebar */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white overflow-hidden">
          <div className="bg-[var(--color-panel)] px-6 py-4"><Skeleton className="h-3 w-24" /></div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 border-t border-[var(--color-border)] px-6 py-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
            <Skeleton className="h-5 w-32" />
            {[1,2,3,4].map(i => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
