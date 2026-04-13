"use client";

import { useState } from "react";
import { SettingsSnapshot, Workspace } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { CategoryRuleManager } from "@/components/settings/category-rule-manager";
import { GlRuleManager } from "@/components/settings/gl-rule-manager";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
import { VatRegistrationCard } from "@/components/settings/vat-registration-card";
import { VatRuleManager } from "@/components/settings/vat-rule-manager";

interface SettingsTabsProps {
  settings: SettingsSnapshot;
}

export function SettingsTabs({ settings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "tax" | "advanced">("general");

  const workspace = settings.workspace;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${
              activeTab === "general"
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
            }`}
          >
            General & Categories
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${
              activeTab === "tax"
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Tax & Company Profile
          </button>
          <button
            onClick={() => setActiveTab("advanced")}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition ${
              activeTab === "advanced"
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Advanced Settings
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === "general" && (
          <div className="max-w-6xl space-y-6">
            <Card className="space-y-5">
              <CategoryRuleManager initialRules={settings.categoryRules} />
            </Card>
          </div>
        )}

        {activeTab === "tax" && (
          <div className="max-w-4xl space-y-6">
            <VatRegistrationCard
              initialVatRegistered={workspace.vatRegistered}
              initialBusinessType={workspace.businessType}
            />
            <VatRuleManager initialRules={settings.vatRules} />
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <GlRuleManager initialRules={settings.glRules} />
            
            <div className="space-y-6">
              <Card className="space-y-5">
                <ToleranceEditor workspace={workspace} />
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
