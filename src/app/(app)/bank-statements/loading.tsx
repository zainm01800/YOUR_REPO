import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function BankStatementsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bank Statements"
        title="Imported statements"
        description="All bank and card statements imported into this workspace."
      />
      <Card className="h-16 skeleton" />
      {[1, 2, 3].map((i) => (
        <Card key={i} className="h-20 skeleton" />
      ))}
    </div>
  );
}
