import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const repository = getRepository();
  const run = await repository.getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    status: run.status,
    locked: !!run.locked,
    processedAt: run.processedAt,
    exports: run.exports,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const repository = getRepository();

  try {
    await repository.deleteRun(runId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete run." },
      { status: 404 },
    );
  }
}
