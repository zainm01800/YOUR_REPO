import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api/auth-guard";

const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { clientId } = await params;
    const client = await repository!.getClient(clientId);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    return NextResponse.json(client);
  } catch (err) {
    console.error("[GET /api/clients/[clientId]]", err);
    return NextResponse.json({ error: "Failed to fetch client." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { clientId } = await params;
    let raw: unknown;
    try { raw = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = UpdateClientSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const client = await repository!.updateClient(clientId, parsed.data);
    return NextResponse.json(client);
  } catch (err) {
    console.error("[PUT /api/clients/[clientId]]", err);
    return NextResponse.json({ error: "Failed to update client." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { repository, errorResponse } = await requireApiAuth();
    if (errorResponse) return errorResponse;
    const { clientId } = await params;
    await repository!.deleteClient(clientId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/clients/[clientId]]", err);
    return NextResponse.json({ error: "Failed to delete client." }, { status: 500 });
  }
}
