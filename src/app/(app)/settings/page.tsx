import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ClientUploadCard } from "@/components/settings/client-upload-card";
import { Card } from "@/components/ui/card";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import {
  getWorkspaceRoleDescription,
  getWorkspaceRoleLabel,
} from "@/lib/auth/workspace-role";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { repository, viewerAccess, currentMembership, viewerUser } =
    await getServerViewerAccess();
  if (!viewerAccess.canSeeSettings) {
    redirect("/dashboard");
  }

  const settings = await repository.getSettingsSnapshot();
  const isOwner = currentMembership?.role === "owner";
  const workspaceRoleLabel = getWorkspaceRoleLabel(currentMembership?.role ?? viewerAccess.workspaceRole);
  const workspaceRoleDescription = getWorkspaceRoleDescription(
    currentMembership?.role ?? viewerAccess.workspaceRole,
  );

  const uploadToken = process.env.UPLOAD_TOKEN?.trim();
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const uploadUrl =
    uploadToken && appUrl ? `${appUrl}/upload/${uploadToken}` : null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="VAT rules, GL codes, category rules, mapping templates, and tolerance settings. All rules are configured at your workspace level."
      />

      <div className="mb-6 max-w-2xl">
        <ClientUploadCard uploadUrl={uploadUrl} />
      </div>

      <div className="mb-6 max-w-3xl">
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Access profile
          </p>
          <p className="text-sm text-[var(--color-foreground)]">
            {viewerAccess.isWebsiteOwner
              ? "Your owner override is active, so you can see the full product even when a normal user would get a simpler view."
              : viewerAccess.isAccountantView
                ? `This login is locked into accountant mode and your current workspace access level is ${workspaceRoleLabel.toLowerCase()}, so the screens and actions you see match that responsibility.`
                : settings.workspace.businessType === "sole_trader"
                  ? `This login is locked into business-user mode and you currently hold the ${workspaceRoleLabel.toLowerCase()} role for this sole trader workspace, so the experience stays focused on the tools relevant to that responsibility.`
                  : `This login is locked into business-user mode and you currently hold the ${workspaceRoleLabel.toLowerCase()} role for this workspace, so specialist accountant controls stay limited unless the owner upgrades your access.`}
          </p>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Current workspace access
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
              {viewerAccess.isWebsiteOwner ? "Owner override" : workspaceRoleLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {viewerAccess.isWebsiteOwner
                ? "Your owner email bypass keeps the full product visible so you can test every workflow regardless of how a normal member would experience the workspace."
                : workspaceRoleDescription}
            </p>
          </div>
          {!viewerAccess.isWebsiteOwner && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Account type for {viewerUser.email} is a one-time choice and cannot be changed later. Workspace access level can only be changed by the workspace owner.
            </p>
          )}
        </Card>
      </div>

      <SettingsTabs settings={settings} isOwner={isOwner} viewerAccess={viewerAccess} />
    </>
  );
}
