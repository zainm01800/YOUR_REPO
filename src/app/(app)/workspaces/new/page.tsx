import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { NewWorkspaceForm } from "./new-workspace-form";

export default function NewWorkspacePage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspaces"
        title="Create a new workspace"
        description="Each workspace is a separate organisation with its own runs, rules, and data."
      />

      <div className="mx-auto max-w-lg">
        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-foreground)] text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Workspace details</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                You&apos;ll be the owner and can invite others later.
              </p>
            </div>
          </div>

          <NewWorkspaceForm />
        </Card>
      </div>
    </>
  );
}
