import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { processRun } from "@/lib/reconciliation/process-run";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const repository = getRepository();
  const [run, vatRules, snapshot] = await Promise.all([
    repository.getRun(runId),
    repository.getVatRules(),
    repository.getDashboardSnapshot(),
  ]);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const output = processRun(run, run.documents, vatRules, snapshot.glRules);
  await repository.updateRun(output.run);

  return NextResponse.redirect(new URL(`/runs/${run.id}/review`, request.url));
}

