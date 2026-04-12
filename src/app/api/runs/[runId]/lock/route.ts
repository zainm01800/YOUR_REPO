import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const repository = getRepository();
  const [run, user] = await Promise.all([
    repository.getRun(runId),
    repository.getCurrentUser(),
  ]);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.locked) {
    return NextResponse.json({ error: "Run is already locked." }, { status: 409 });
  }

  const lockedRun = {
    ...run,
    locked: true,
    lockedAt: new Date().toISOString(),
    lockedBy: user.name || user.email,
    status: "exported" as const,
  };

  await repository.updateRun(lockedRun);
  return NextResponse.json({ success: true, lockedAt: lockedRun.lockedAt, lockedBy: lockedRun.lockedBy });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const repository = getRepository();
  const run = await repository.getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const unlockedRun = {
    ...run,
    locked: false,
    lockedAt: undefined,
    lockedBy: undefined,
    status: "review_required" as const,
  };

  await repository.updateRun(unlockedRun);
  return NextResponse.json({ success: true });
}
