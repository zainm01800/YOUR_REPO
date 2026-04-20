import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      {/* Report body */}
      <div className="space-y-4">
        {[1, 2, 3].map((section) => (
          <div
            key={section}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center justify-between">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
            <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
