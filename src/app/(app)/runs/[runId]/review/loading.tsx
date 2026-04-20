import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="ml-auto h-10 w-28" />
      </div>
      <SkeletonTable rows={10} cols={8} />
    </div>
  );
}
