import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";

const bodySchema = z.object({
  vatRegistered: z.boolean().optional(),
  businessType: z.enum(["sole_trader", "general_small_business"]).optional(),
  amountTolerance: z.number().min(0).optional(),
  dateToleranceDays: z.number().int().min(0).optional(),
  defaultCurrency: z.string().optional(),
  countryProfile: z.string().optional(),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const repository = getRepository();
    const workspace = await repository.updateWorkspace(parsed.data);
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("[workspace PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
