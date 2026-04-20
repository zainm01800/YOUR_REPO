import { Skeleton } from "@/components/ui/skeleton";

export default function ExportLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-[480px]" />
      </div>
      {/* Readiness banner */}
      <Skeleton className="h-32 w-full rounded-3xl" />
      {/* Download panel */}
      <Skeleton className="h-48 w-full rounded-3xl" />
      {/* History table */}
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
