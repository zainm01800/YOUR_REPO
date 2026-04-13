import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { processRun } from "@/lib/reconciliation/process-run";
import { getFxRates } from "@/lib/fx/rates";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const repository = await getRepository();
  const [run, vatRules, snapshot] = await Promise.all([
    repository.getRun(runId),
    repository.getVatRules(),
    repository.getDashboardSnapshot(),
  ]);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.locked) {
    return NextResponse.json({ error: "Locked runs cannot be reprocessed." }, { status: 409 });
  }

  await repository.updateRun({
    ...run,
    status: "processing",
  });

  // Fetch live exchange rates relative to the run's home currency
  const runCurrency = run.defaultCurrency ?? "GBP";
  const fxRates = await getFxRates(runCurrency);
  run.fxRates = fxRates;

  const workspace = snapshot.workspace;
  const output = processRun(run, run.documents, vatRules, snapshot.glRules, {
    amountTolerance: workspace.amountTolerance,
    dateToleranceDays: workspace.dateToleranceDays,
  });
  await repository.updateRun(output.run);

  return NextResponse.json({
    ok: true,
    status: output.run.status,
    processedAt: output.run.processedAt,
  });
}
