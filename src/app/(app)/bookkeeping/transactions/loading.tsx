import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookkeeping"
        title="Transactions"
        description="All imported transactions across every run."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i} className="h-20 skeleton" />
        ))}
      </div>
      <Card className="h-[500px] skeleton" />
    </div>
  );
}
