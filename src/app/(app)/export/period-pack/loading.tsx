import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function PeriodExportLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Export & Output"
        title="Period Export Pack"
        description="Download a complete multi-sheet Excel workbook for any period."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <Card className="h-96 skeleton" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
