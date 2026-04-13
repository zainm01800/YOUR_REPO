import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";

const bodySchema = z.object({
  category: z.string().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const repository = await getRepository();
    await repository.setTransactionCategory(transactionId, parsed.data.category);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[category PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
