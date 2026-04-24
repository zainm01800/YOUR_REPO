"use client";

import { useState } from "react";
import { Building2, CreditCard, Layers, Users, Bell, ShieldAlert } from "lucide-react";
import type { SettingsSnapshot, Workspace } from "@/lib/domain/types";
import type { ViewerAccessProfile } from "@/lib/auth/viewer-access";
import { Card } from "@/components/ui/card";
import { CategoryRuleManager } from "@/components/settings/category-rule-manager";
import { GlRuleManager } from "@/components/settings/gl-rule-manager";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
import { VatRegistrationCard } from "@/components/settings/vat-registration-card";
import { VatRuleManager } from "@/components/settings/vat-rule-manager";
import { MemberManager } from "@/components/settings/member-manager";
import { DeleteWorkspaceCard } from "@/components/settings/delete-workspace-card";

interface SettingsTabsProps {
  settings: SettingsSnapshot;
  isOwner: boolean;
  viewerAccess: ViewerAccessProfile;
}

type TabId = "business" | "categories" | "team" | "advanced" | "danger";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  hidden?: boolean;
}

export function SettingsTabs({ settings, isOwner, viewerAccess }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("business");
  const workspace = settings.workspace;

  const tabs: TabItem[] = ([
    { id: "business" as TabId, label: "Business & VAT", icon: Building2 },
    { id: "categories" as TabId, label: "Categories", icon: Layers },
    { id: "team" as TabId, label: "Members & Access", icon: Users },
    { id: "advanced" as TabId, label: "Advanced", icon: CreditCard, hidden: !viewerAccess.canSeeFullAccounting },
    { id: "danger" as TabId, label: "Danger zone", icon: ShieldAlert },
  ] as TabItem[]).filter((t) => !t.hidden);

  return (
    <div className="flex gap-6">
      {/* Left vertical nav */}
      <aside className="w-48 shrink-0">
        <nav className="space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition ${
                  isActive
                    ? "bg-white text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:bg-white/80 hover:text-[var(--color-foreground)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Tab content */}
      <div className="flex-1 min-w-0">
        {activeTab === "business" && (
          <div className="space-y-6 max-w-2xl">
            <VatRegistrationCard
              initialVatRegistered={workspace.vatRegistered}
              initialBusinessType={workspace.businessType}
            />
            <VatRuleManager initialRules={settings.vatRules} />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
            <Card className="space-y-5">
              <CategoryRuleManager initialRules={settings.categoryRules} />
            </Card>
          </div>
        )}

        {activeTab === "team" && (
          <div>
            <MemberManager
              memberships={settings.memberships}
              invitations={settings.invitations}
              workspaceId={workspace.id}
            />
          </div>
        )}

        {activeTab === "advanced" && viewerAccess.canSeeFullAccounting && (
          <div className="space-y-6">
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
                      Saved column mappings from previous uploads.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {settings.templates.length === 0 ? (
                      <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
                        No mapping templates saved yet.
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
          </div>
        )}

        {activeTab === "danger" && (
          <div className="max-w-2xl">
            <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
              Destructive actions that cannot be undone. Please be certain before proceeding.
            </p>
            <DeleteWorkspaceCard
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>
  );
}
