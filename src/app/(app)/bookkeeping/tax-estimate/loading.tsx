import { Skeleton } from "@/components/ui/skeleton";
export default function TaxEstimateLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 space-y-3">
        <Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96" />
      </div>
      {[1,2,3].map(i=><Skeleton key={i} className="h-48 w-full rounded-3xl"/>)}
    </div>
  );
}
