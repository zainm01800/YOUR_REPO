import { Skeleton } from "@/components/ui/skeleton";

export default function MappingLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Column mapper */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-9 w-40" />
          </div>
        ))}
      </div>
      {/* Preview table */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
