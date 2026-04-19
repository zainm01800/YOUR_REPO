import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ClientUploadCard } from "@/components/settings/client-upload-card";
import { getRepository } from "@/lib/data";
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

      <SettingsTabs settings={settings} isOwner={isOwner} />
    </>
  );
}
