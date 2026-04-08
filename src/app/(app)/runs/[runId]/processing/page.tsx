import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/data";

export default async function ProcessingPage({
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

  const steps = [
    "Parse transaction file and detect columns",
    "Expand ZIP uploads and register supported documents",
    "Extract supplier, date, VAT, and totals from each document",
    "Score document-to-transaction matches",
    "Build review rows and surface exceptions",
  ];

  return (
    <>
      <PageHeader
        eyebrow="Processing"
        title="Run extraction, matching, and finance validation"
        description="The MVP uses a deterministic pipeline so every match and exception remains explainable."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card className="space-y-5">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start gap-5 rounded-2xl bg-[var(--color-panel)] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--color-accent)] shadow-sm">
                {index + 1}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">{step}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Designed so the worker can be swapped from mock/demo mode to a real OCR provider later.
                </p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Start processing</h2>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            For the seeded demo run, processing has already completed. For new runs, this
            button triggers the background-safe processing service and then sends the user
            to review.
          </p>
          <form action={`/api/runs/${run.id}/process`} method="post">
            <Button className="w-full">Process run</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

