import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function RunsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-[480px]" />
      </div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <SkeletonTable rows={6} cols={9} />
    </div>
  );
}
