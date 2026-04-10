import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

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
