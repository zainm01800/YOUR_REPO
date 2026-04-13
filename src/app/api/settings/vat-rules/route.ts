import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import type { VatRule } from "@/lib/domain/types";

/**
 * PUT /api/settings/vat-rules
 * Full-replace all workspace VAT rules with the provided list.
 * Used by the Country VAT Rate Manager in settings.
 */
export async function PUT(request: Request) {
  const repository = await getRepository();

  let body: { rules: Omit<VatRule, "id">[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.rules)) {
    return NextResponse.json({ error: "rules must be an array." }, { status: 400 });
  }

  const rules: VatRule[] = body.rules.map((r) => ({
    id: randomUUID(),
    countryCode: String(r.countryCode),
    rate: Number(r.rate),
    taxCode: String(r.taxCode),
    recoverable: Boolean(r.recoverable),
    description: String(r.description),
  }));

  const saved = await repository.replaceAllVatRules(rules);
  return NextResponse.json({ ok: true, count: saved.length, rules: saved });
}
