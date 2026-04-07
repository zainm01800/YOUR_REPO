import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";

export default async function NewRunPage() {
  const repository = getRepository();
  const [workspace, templates] = await Promise.all([
    repository.getWorkspace(),
    repository.getTemplates(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="New Reconciliation Run"
        title="Upload transactions, receipts, and start a clean review flow"
        description="Use one upload flow for card exports, AP files, and receipt batches. Mapping and review come next."
      />

      <Card>
        <form action="/api/runs" method="post" encType="multipart/form-data" className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Run name</span>
              <Input name="name" defaultValue="April card reconciliation" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Entity</span>
              <Input name="entity" defaultValue="Northstar Holdings Ltd" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Default currency</span>
              <Input value={workspace.defaultCurrency} readOnly />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Country / tax profile</span>
              <Select name="countryProfile" defaultValue={workspace.countryProfile}>
                <option value="GB">United Kingdom</option>
                <option value="IE">Ireland</option>
                <option value="EU">EU general</option>
              </Select>
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Transaction file</span>
              <Input name="transactionFile" type="file" accept=".csv,.xlsx,.xls" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Receipts or ZIP archive</span>
              <Input
                name="documentFiles"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.zip"
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Mapping template</span>
              <Select name="templateId" defaultValue={templates[0]?.id}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Notes</span>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Optional reminders for this run, entity, or reviewer."
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button>Create run</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
