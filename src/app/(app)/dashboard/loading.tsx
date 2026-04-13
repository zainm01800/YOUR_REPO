import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Reconciliation control room"
        description="Track every run, review exceptions, and move approved data into posting files."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32 skeleton" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="h-96 skeleton" />
        <Card className="h-96 skeleton" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="h-[500px] skeleton" />
        <div className="space-y-5">
           <Card className="h-64 skeleton" />
           <Card className="h-64 skeleton" />
        </div>
      </div>
    </div>
  );
}
