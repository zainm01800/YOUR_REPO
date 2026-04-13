import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function SpendingLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookkeeping"
        title="Spending"
        description="Breakdown of all spending across categories and periods."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-24 skeleton" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="h-80 skeleton" />
        <Card className="h-80 skeleton" />
      </div>
      <Card className="h-64 skeleton" />
    </div>
  );
}
