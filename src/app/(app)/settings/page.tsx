import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/data";

export default async function SettingsPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Keep rules configurable by workspace"
        description="VAT mappings, GL suggestions, tolerance settings, and mapping templates live at the workspace level so the product stays reusable across companies."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-5">
          <h2 className="text-xl font-semibold">VAT rules</h2>
          <div className="space-y-3">
            {snapshot.vatRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                <div className="font-semibold text-[var(--color-foreground)]">
                  {rule.countryCode} {rule.rate.toFixed(1)}% → {rule.taxCode}
                </div>
                <div className="mt-1 text-[var(--color-muted-foreground)]">{rule.description}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-xl font-semibold">GL suggestions</h2>
          <div className="space-y-3">
            {snapshot.glRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                <div className="font-semibold text-[var(--color-foreground)]">
                  {rule.glCode} · {rule.label}
                </div>
                <div className="mt-1 text-[var(--color-muted-foreground)]">
                  Supplier pattern: {rule.supplierPattern || "None"} · Keyword pattern: {rule.keywordPattern || "None"}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-xl font-semibold">Mapping templates</h2>
          <div className="space-y-3">
            {snapshot.templates.map((template) => (
              <div key={template.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                <div className="font-semibold text-[var(--color-foreground)]">{template.name}</div>
                <div className="mt-1 text-[var(--color-muted-foreground)]">
                  {Object.entries(template.columnMappings)
                    .map(([field, column]) => `${field}: ${column}`)
                    .join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-xl font-semibold">Tolerance</h2>
          <div className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm leading-8 text-[var(--color-muted-foreground)]">
            Amount tolerance: {snapshot.workspace.amountTolerance.toFixed(2)}
            <br />
            Date tolerance: {snapshot.workspace.dateToleranceDays} days
            <br />
            Default currency: {snapshot.workspace.defaultCurrency}
            <br />
            Country profile: {snapshot.workspace.countryProfile}
          </div>
        </Card>
      </div>
    </>
  );
}
