import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ClientUploadCard } from "@/components/settings/client-upload-card";
import { Card } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { buildViewerAccessProfile } from "@/lib/auth/viewer-access";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const repository = await getRepository();
  const [settings, currentUser, userWorkspaces] = await Promise.all([
    repository.getSettingsSnapshot(),
    repository.getCurrentUser(),
    repository.getUserWorkspaces(),
  ]);

  const currentWorkspaceId = settings.workspace.id;
  const myMembership = userWorkspaces.find((w) => w.id === currentWorkspaceId);
  const isOwner = myMembership?.role === "owner";
  const viewerAccess = buildViewerAccessProfile(currentUser, settings.workspace);

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
                ? "This account is in accountant mode, so advanced accounting screens and tools stay visible."
                : settings.workspace.businessType === "sole_trader"
                  ? "This workspace is in sole trader business-user mode, so the experience stays focused on reconciliation, VAT, and tax summaries."
                  : "This workspace is in business-user mode, so the day-to-day bookkeeping tools stay visible while the more specialist accountant tools stay limited."}
          </p>
        </Card>
      </div>

      <SettingsTabs settings={settings} isOwner={isOwner} viewerAccess={viewerAccess} />
    </>
  );
}
