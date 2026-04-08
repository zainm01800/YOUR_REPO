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
  };

  await repository.saveReviewMutation(body);
  return NextResponse.json({ ok: true });
}
