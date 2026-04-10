import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
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
        {/* VAT rules */}
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">VAT rules</h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Country-specific VAT rates mapped to tax codes. Used during exception detection.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {snapshot.vatRules.length === 0 ? (
              <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
                No VAT rules configured for this workspace.
              </p>
            ) : (
              snapshot.vatRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm">
                  <div className="font-semibold text-[var(--color-foreground)]">
                    {rule.countryCode} {rule.rate.toFixed(1)}% → {rule.taxCode}
                  </div>
                  <div className="mt-1 text-[var(--color-muted-foreground)]">{rule.description}</div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {rule.recoverable ? "Recoverable" : "Non-recoverable"}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

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
