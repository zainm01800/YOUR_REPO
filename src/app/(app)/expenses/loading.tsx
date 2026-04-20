import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-16 rounded-2xl"/>)}</div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
