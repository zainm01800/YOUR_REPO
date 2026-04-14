import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getFxRates } from "@/lib/fx/rates";
import { processRun } from "@/lib/reconciliation/process-run";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const repository = await getRepository();
  const body = (await request.json()) as {
    bankSourceMode: "statement" | "all_unreconciled" | "skip" | "later" | "ocr_only";
    bankStatementId?: string;
  };

  const run = await repository.getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.locked) {
    return NextResponse.json({ error: "Locked runs cannot change bank source." }, { status: 409 });
  }

  const attached = await repository.attachBankSourceToRun({
    runId,
    bankSourceMode: body.bankSourceMode,
    bankStatementId: body.bankStatementId,
  });

  const vatRules = await repository.getVatRules();
  const snapshot = await repository.getDashboardSnapshot();

  attached.fxRates = await getFxRates(attached.defaultCurrency ?? snapshot.workspace.defaultCurrency);
  const output = processRun(attached, attached.documents, vatRules, snapshot.glRules, {
    amountTolerance: snapshot.workspace.amountTolerance,
    dateToleranceDays: snapshot.workspace.dateToleranceDays,
  });
  await repository.updateRun(output.run);

  const [updatedRun, rows] = await Promise.all([
    repository.getRun(runId),
    repository.getRunRows(runId),
  ]);

  return NextResponse.json({
    ok: true,
    run: updatedRun,
    rows,
  });
}
