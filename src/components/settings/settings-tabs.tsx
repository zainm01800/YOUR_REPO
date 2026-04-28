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

type TabId = "business" | "categories" | "team" | "notifications" | "advanced" | "danger";

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
    { id: "business" as TabId, label: "Business details", icon: Building2, hidden: !viewerAccess.canManageBusinessSettings },
    { id: "categories" as TabId, label: "Categories", icon: Layers, hidden: !viewerAccess.canManageAccountingSettings },
    { id: "team" as TabId, label: "Members", icon: Users, hidden: !viewerAccess.canManageMembers },
    { id: "notifications" as TabId, label: "Notifications", icon: Bell, hidden: !viewerAccess.canSeeSettings },
    { id: "advanced" as TabId, label: "Advanced", icon: CreditCard, hidden: !viewerAccess.canManageAccountingSettings },
    { id: "danger" as TabId, label: "Danger zone", icon: ShieldAlert, hidden: !viewerAccess.canDeleteWorkspace },
  ] as TabItem[]).filter((t) => !t.hidden);

  return (
    <div className="space-y-6">
      {/* Horizontal pill tab bar */}
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
          </div>
        )}

        {activeTab === "categories" && viewerAccess.canManageAccountingSettings && (
          <div className="space-y-6">
            <Card className="space-y-5">
              <CategoryRuleManager initialRules={settings.categoryRules} />
            </Card>
          </div>
        )}

        {activeTab === "team" && viewerAccess.canManageMembers && (
          <div>
            <MemberManager
              memberships={settings.memberships}
              invitations={settings.invitations}
              workspaceId={workspace.id}
            />
          </div>
        )}

        {activeTab === "notifications" && viewerAccess.canSeeSettings && (
          <div className="max-w-2xl space-y-4">
            <Card className="space-y-5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Notifications</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Choose what activity triggers an email or in-app notification.
                </p>
              </div>
              {[
                { label: "Invoice paid", sub: "When a client invoice is marked as paid" },
                { label: "Invoice overdue", sub: "When an invoice passes its due date" },
                { label: "New member joined", sub: "When someone accepts a workspace invite" },
                { label: "Monthly summary", sub: "A brief P&L summary emailed each month" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{item.label}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{item.sub}</p>
                  </div>
                  <div className="relative h-5 w-9 shrink-0">
                    <div className="h-5 w-9 rounded-full bg-[var(--color-border)]" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                  </div>
                </div>
              ))}
              <p className="text-xs text-[var(--color-muted-foreground)]">Notification preferences coming soon. These settings are displayed for preview only.</p>
            </Card>
          </div>
        )}

        {activeTab === "advanced" && viewerAccess.canManageAccountingSettings && (
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

        {activeTab === "danger" && viewerAccess.canDeleteWorkspace && (
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
