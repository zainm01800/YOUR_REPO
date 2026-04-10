import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import type { ReviewActionType } from "@/lib/domain/types";

export async function POST(request: Request) {
  const repository = getRepository();
  const body = (await request.json()) as {
    runId: string;
    rowId: string;
    actionType: ReviewActionType;
    field?: string;
    value?: string;
    note?: string;
    payload?: Record<string, unknown>;
  };

  const mutation = await repository.saveReviewMutation(body);
  const [run, rows] = await Promise.all([
    repository.getRun(body.runId),
    repository.getRunRows(body.runId),
  ]);

  return NextResponse.json({
    ok: true,
    mutation,
    run,
    rows,
  });
}
