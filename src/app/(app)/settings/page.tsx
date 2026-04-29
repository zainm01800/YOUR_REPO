import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getServerViewerAccess } from "@/lib/auth/server-viewer-access";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { repository, viewerAccess, currentMembership } =
    await getServerViewerAccess();
  if (!viewerAccess.canSeeSettings) {
    redirect("/dashboard");
  }

  const settings = await repository.getSettingsSnapshot();
  const isOwner = currentMembership?.role === "owner";

  const uploadToken = process.env.UPLOAD_TOKEN?.trim();
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const uploadUrl =
    uploadToken && appUrl ? `${appUrl}/upload/${uploadToken}` : null;

  return (
    <>
      <PageHeader eyebrow="Configure" title="Settings" />
      <SettingsTabs
        settings={settings}
        isOwner={isOwner}
        viewerAccess={viewerAccess}
        uploadUrl={uploadUrl}
      />
    </>
  );
}
