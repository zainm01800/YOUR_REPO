import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { RuleImportCard } from "@/components/settings/rule-import-card";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
import { VatSyncCard } from "@/components/settings/vat-sync-card";
import { CountryVatPicker } from "@/components/settings/country-vat-picker";
import { getRepository } from "@/lib/data";

export default async function SettingsPage() {
  const repository = getRepository();
  const snapshot = await repository.getDashboardSnapshot();
  const workspace = snapshot.workspace;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="VAT rules, GL code suggestions, mapping templates, and tolerance settings. VAT rules and GL patterns are configured at the workspace level so they carry across all runs."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <VatSyncCard currentRuleCount={snapshot.vatRules.length} />

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

        {/* VAT rules — country picker */}
        <Card className="space-y-5">
          <CountryVatPicker initialRules={snapshot.vatRules} />
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

        {/* GL suggestions */}
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">GL code suggestions</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Pattern-based rules that auto-suggest GL codes based on supplier name and description keywords.
            </p>
          </div>
          <div className="space-y-3">
            {snapshot.glRules.length === 0 ? (
              <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
                No GL rules configured for this workspace.
              </p>
            ) : (
              snapshot.glRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-white px-2 py-1 font-mono text-xs font-semibold text-[var(--color-foreground)] shadow-sm">
                      {rule.glCode}
                    </span>
                    <span className="font-semibold text-[var(--color-foreground)]">{rule.label}</span>
                  </div>
                  <div className="mt-2 text-[var(--color-muted-foreground)]">
                    {rule.supplierPattern && (
                      <span>Supplier: <span className="font-mono text-xs">{rule.supplierPattern}</span></span>
                    )}
                    {rule.supplierPattern && rule.keywordPattern && <span> · </span>}
                    {rule.keywordPattern && (
                      <span>Keywords: <span className="font-mono text-xs">{rule.keywordPattern}</span></span>
                    )}
                    {!rule.supplierPattern && !rule.keywordPattern && "No patterns defined"}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Mapping templates */}
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Mapping templates</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Saved column mappings from previous uploads. Applied when creating a new run.
            </p>
          </div>
          <div className="space-y-3">
            {snapshot.templates.length === 0 ? (
              <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
                No mapping templates saved yet. They appear here after you save one during a run.
              </p>
            ) : (
              snapshot.templates.map((template) => (
                <div key={template.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                  <div className="font-semibold text-[var(--color-foreground)]">{template.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(template.columnMappings).map(([field, column]) => (
                      <span key={field} className="rounded-lg bg-white px-2 py-1 font-mono text-xs text-[var(--color-muted-foreground)] shadow-sm">
                        {field}: {column}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Tolerance (editable) */}
        <Card className="space-y-5">
          <ToleranceEditor workspace={workspace} />
        </Card>
      </div>
    </>
  );
}
