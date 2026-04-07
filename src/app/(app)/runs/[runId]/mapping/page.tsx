import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MappingGrid } from "@/components/run-flow/mapping-grid";
import { getRepository } from "@/lib/data";

export default async function MappingPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const repository = getRepository();
  const run = await repository.getRun(runId);

  if (!run) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Column Mapping"
        title="Confirm how incoming transaction columns should be interpreted"
        description="The mapping layer keeps the product universal. Users can upload different exports and still reconcile them in the same workflow."
        actions={
          <Link href={`/runs/${run.id}/processing`}>
            <Button>Continue to processing</Button>
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <MappingGrid
          headers={run.previewHeaders || ["Date", "Amount", "Merchant", "Description"]}
          selected={run.savedColumnMappings}
        />
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
              Import preview
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              This run will support reusable templates so the same export format does not
              need remapping every month.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Detected headers
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(run.previewHeaders || []).map((header) => (
                <span
                  key={header}
                  className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium"
                >
                  {header}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

