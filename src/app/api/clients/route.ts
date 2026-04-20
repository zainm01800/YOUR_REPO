import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const CreateClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  vatNumber: z.string().max(50).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const clients = await repository!.getClients();
    return NextResponse.json(clients);
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = CreateClientSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const client = await repository!.createClient(parsed.data);
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
