import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-[560px]" />
      </div>
      {/* Tab bar */}
      <div className="border-b border-[var(--color-border)] flex gap-6 pb-0">
        {[80, 120, 100, 140].map((w, i) => (
          <Skeleton key={i} className="h-10 rounded-none rounded-t-lg" style={{ width: `${w}px` }} />
        ))}
      </div>
      {/* Content area */}
      <div className="space-y-5 max-w-6xl">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-72" />
          {[1,2,3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-[var(--color-panel)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
