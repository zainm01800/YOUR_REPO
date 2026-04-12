import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export async function DELETE(request: Request) {
  const body = (await request.json()) as { ids?: unknown };
  const ids = body.ids;

  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids must be a non-empty array of strings." }, { status: 400 });
  }

  const repository = getRepository();
  await repository.deleteTransactions(ids as string[]);
  return NextResponse.json({ ok: true, deleted: ids.length });
}
