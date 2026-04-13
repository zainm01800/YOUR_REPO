import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function RunsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reconciliation"
        title="All runs"
        description="Every reconciliation run stays available for review, re-export, and use in the Posting File Builder."
      />
      <Card className="h-16 skeleton" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="h-14 skeleton" />
      ))}
    </div>
  );
}
