"use client";

import { useState } from "react";
import { Building2, SlidersHorizontal, Users, ShieldAlert } from "lucide-react";
import type { SettingsSnapshot } from "@/lib/domain/types";
import type { ViewerAccessProfile } from "@/lib/auth/viewer-access";
import { Card } from "@/components/ui/card";
import { CategoryRuleManager } from "@/components/settings/category-rule-manager";
import { GlRuleManager } from "@/components/settings/gl-rule-manager";
import { ToleranceEditor } from "@/components/settings/tolerance-editor";
import { VatRegistrationCard } from "@/components/settings/vat-registration-card";
import { VatRuleManager } from "@/components/settings/vat-rule-manager";
import { MemberManager } from "@/components/settings/member-manager";
import { DeleteWorkspaceCard } from "@/components/settings/delete-workspace-card";
import { ClientUploadCard } from "@/components/settings/client-upload-card";

interface SettingsTabsProps {
  settings: SettingsSnapshot;
  isOwner: boolean;
  viewerAccess: ViewerAccessProfile;
  uploadUrl: string | null;
}

type TabId = "business" | "categories" | "team" | "advanced" | "danger";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  hidden?: boolean;
}

export function SettingsTabs({ settings, isOwner, viewerAccess, uploadUrl }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("business");
  const workspace = settings.workspace;

  const tabs: TabItem[] = ([
    { id: "business" as TabId, label: "Business", icon: Building2, hidden: !viewerAccess.canManageBusinessSettings },
    { id: "categories" as TabId, label: "Categories", icon: SlidersHorizontal, hidden: !viewerAccess.canManageAccountingSettings },
    { id: "team" as TabId, label: "Members", icon: Users, hidden: !viewerAccess.canManageMembers },
    { id: "advanced" as TabId, label: "Advanced", icon: SlidersHorizontal, hidden: !viewerAccess.canManageAccountingSettings },
    { id: "danger" as TabId, label: "Danger", icon: ShieldAlert, hidden: !viewerAccess.canDeleteWorkspace },
  ] as TabItem[]).filter((t) => !t.hidden);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-sm)] w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--ink-2)] hover:bg-[#f4f2ed]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-w-0">
        {activeTab === "business" && viewerAccess.canManageBusinessSettings && (
          <div className="space-y-6 max-w-2xl">
            <VatRegistrationCard
              initialVatRegistered={workspace.vatRegistered}
              initialBusinessType={workspace.businessType}
            />
            <VatRuleManager initialRules={settings.vatRules} />
            {uploadUrl && <ClientUploadCard uploadUrl={uploadUrl} />}
          </div>
        )}

        {activeTab === "categories" && viewerAccess.canManageAccountingSettings && (
          <Card className="space-y-5">
            <CategoryRuleManager initialRules={settings.categoryRules} />
          </Card>
        )}

        {activeTab === "team" && viewerAccess.canManageMembers && (
          <MemberManager
            memberships={settings.memberships}
            invitations={settings.invitations}
            workspaceId={workspace.id}
          />
        )}

        {activeTab === "advanced" && viewerAccess.canManageAccountingSettings && (
          <div className="grid gap-6 xl:grid-cols-2">
            <GlRuleManager initialRules={settings.glRules} />
            <div className="space-y-6">
              <Card className="space-y-5">
                <ToleranceEditor workspace={workspace} />
              </Card>
              {settings.templates.length > 0 && (
                <Card className="space-y-4">
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Mapping templates</h2>
                  <div className="space-y-2">
                    {settings.templates.map((template) => (
                      <div key={template.id} className="rounded-xl bg-[var(--color-panel)] p-4 text-sm">
                        <div className="font-medium text-[var(--color-foreground)]">{template.name}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(template.columnMappings).map(([field, column]) => (
                            <span
                              key={field}
                              className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-[var(--color-muted-foreground)] shadow-sm"
                            >
                              {field}: {column}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === "danger" && viewerAccess.canDeleteWorkspace && (
          <div className="max-w-xl">
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
