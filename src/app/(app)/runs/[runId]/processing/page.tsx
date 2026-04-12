import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ProcessingClient } from "@/components/run-flow/processing-client";
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
  return (
    <>
      <PageHeader
        eyebrow="Processing"
        title="Run extraction, matching, and finance validation"
        description="The MVP uses a deterministic pipeline so every match and exception remains explainable."
      />
      <ProcessingClient runId={run.id} />
    </>
  );
}
