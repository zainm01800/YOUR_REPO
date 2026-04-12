import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import type { GlCodeRule } from "@/lib/domain/types";

export async function PUT(request: Request) {
  const repository = getRepository();

  let body: { rules: Omit<GlCodeRule, "id">[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.rules)) {
    return NextResponse.json({ error: "rules must be an array." }, { status: 400 });
  }

  const rules: GlCodeRule[] = body.rules.map((rule) => ({
    id: randomUUID(),
    glCode: String(rule.glCode),
    label: String(rule.label),
    supplierPattern: rule.supplierPattern ? String(rule.supplierPattern) : undefined,
    keywordPattern: rule.keywordPattern ? String(rule.keywordPattern) : undefined,
    priority: Number(rule.priority ?? 100),
  }));

  const saved = await repository.replaceAllGlCodeRules(rules);
  return NextResponse.json({ ok: true, count: saved.length, rules: saved });
}
