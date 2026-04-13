import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { CategoryRuleManager } from "@/components/settings/category-rule-manager";
import { CountryVatPicker } from "@/components/settings/country-vat-picker";
import { GlRuleManager } from "@/components/settings/gl-rule-manager";
import { RuleImportCard } from "@/components/settings/rule-import-card";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
import { VatRegistrationCard } from "@/components/settings/vat-registration-card";
import { VatRuleManager } from "@/components/settings/vat-rule-manager";
import { VatSyncCard } from "@/components/settings/vat-sync-card";
import { getRepository } from "@/lib/data";

export default async function SettingsPage() {
  const repository = getRepository();
  const settings = await repository.getSettingsSnapshot();
  const workspace = settings.workspace;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="VAT rules, GL codes, category rules, mapping templates, and tolerance settings. All rules are configured at the workspace level and apply across every run."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <VatRegistrationCard
          initialVatRegistered={workspace.vatRegistered}
          initialBusinessType={workspace.businessType}
        />

        <VatSyncCard currentRuleCount={settings.vatRules.length} />

        <RuleImportCard
          title="Import GL codes"
          description="Paste a nominal-code list or upload Excel/CSV so ClearMatch can suggest GL codes consistently."
          endpoint="/api/settings/gl-rules/import"
          exampleLines={[
            "650060 - Travel expenses",
            "650100, Software subscriptions",
            "650200 | Client entertainment | restaurant|dinner | 120",
          ]}
          helperText={`Paste one row per line.\nAccepted formats:\n650060 - Travel expenses\n650060, Travel expenses\n650200 | Client entertainment | supplierPattern | keywordPattern | priority\n\nSpreadsheet headers can be: glCode/code/accountCode, label/description, supplierPattern, keywordPattern, priority.`}
        />

        <Card className="space-y-5">
          <CountryVatPicker initialRules={settings.vatRules} />
        </Card>

        <RuleImportCard
          title="Import VAT codes"
          description="Paste VAT codes and rates or upload Excel/CSV so the workspace can use your own tax mappings."
          endpoint="/api/settings/vat-rules/import"
          exampleLines={[
            "GB,20,GB20,true,Standard UK VAT",
            "GB,0,GB0,true,Zero rated UK VAT",
            "DE | 19 | DE19 | true | German standard VAT",
          ]}
          helperText={`Paste one row per line.\nAccepted formats:\nGB,20,GB20,true,Standard UK VAT\nDE | 19 | DE19 | true | German standard VAT\n\nSpreadsheet headers can be: country/countryCode, rate/taxRate, taxCode/vatCode, recoverable, description.`}
        />

        <VatRuleManager initialRules={settings.vatRules} />

        <GlRuleManager initialRules={settings.glRules} />

        {/* Category rules */}
        <Card className="space-y-5">
          <CategoryRuleManager initialRules={settings.categoryRules} />
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Mapping templates</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Saved column mappings from previous uploads. Applied when creating a new run.
            </p>
          </div>
          <div className="space-y-3">
            {settings.templates.length === 0 ? (
              <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
                No mapping templates saved yet. They appear here after you save one during a run.
              </p>
            ) : (
              settings.templates.map((template) => (
                <div key={template.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                  <div className="font-semibold text-[var(--color-foreground)]">{template.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(template.columnMappings).map(([field, column]) => (
                      <span
                        key={field}
                        className="rounded-lg bg-white px-2 py-1 font-mono text-xs text-[var(--color-muted-foreground)] shadow-sm"
                      >
                        {field}: {column}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <ToleranceEditor workspace={workspace} />
        </Card>
      </div>
    </>
  );
}
