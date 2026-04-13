import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import {
  parseGlRulesFromText,
  parseGlRulesFromWorkbook,
} from "@/lib/settings/rule-import";

export async function POST(request: Request) {
  const repository = await getRepository();
  const formData = await request.formData();
  const notes = String(formData.get("notes") || "");
  const file = formData.get("file");

  const importedRules = [
    ...parseGlRulesFromText(notes),
    ...(file instanceof File && file.size > 0
      ? parseGlRulesFromWorkbook(await file.arrayBuffer())
      : []),
  ];

  if (importedRules.length === 0) {
    return NextResponse.json(
      { error: "No GL code rows were found. Paste lines like 650060 - Travel expenses or upload an .xlsx/.csv file." },
      { status: 400 },
    );
  }

  const dedupedRules = Array.from(
    new Map(importedRules.map((rule) => [rule.glCode, rule])).values(),
  );
  const rules = await repository.upsertGlCodeRules({ rules: dedupedRules });

  return NextResponse.json({
    ok: true,
    importedCount: dedupedRules.length,
    rules,
  });
}
