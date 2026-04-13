import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function TaxSummaryLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookkeeping"
        title="Tax summary"
        description="Practical profit, VAT, and estimated tax figures built from categorised bookkeeping data."
      />
      <Card className="h-64 skeleton" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="h-40 skeleton" />
          <Card className="h-48 skeleton" />
          <Card className="h-48 skeleton" />
        </div>
        <div className="space-y-6">
          <Card className="h-64 skeleton" />
          <Card className="h-64 skeleton" />
        </div>
      </div>
    </div>
  );
}
