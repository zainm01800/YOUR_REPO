import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="VAT rules, GL codes, category rules, mapping templates, and tolerance settings."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-48 skeleton" />
        ))}
      </div>
    </div>
  );
}
