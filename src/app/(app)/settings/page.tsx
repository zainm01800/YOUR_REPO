import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getRepository } from "@/lib/data";

export default async function SettingsPage() {
  const repository = await getRepository();
  const settings = await repository.getSettingsSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="VAT rules, GL codes, category rules, mapping templates, and tolerance settings. All rules are configured at your workspace level."
      />

      <SettingsTabs settings={settings} />
    </>
  );
}
