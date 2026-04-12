import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import {
  parseVatRulesFromText,
  parseVatRulesFromWorkbook,
} from "@/lib/settings/rule-import";

export async function POST(request: Request) {
  const repository = getRepository();
  const formData = await request.formData();
  const notes = String(formData.get("notes") || "");
  const file = formData.get("file");

  const importedRules = [
    ...parseVatRulesFromText(notes),
    ...(file instanceof File && file.size > 0
      ? parseVatRulesFromWorkbook(await file.arrayBuffer())
      : []),
  ];

  if (importedRules.length === 0) {
    return NextResponse.json(
      { error: "No VAT rule rows were found. Paste lines like GB,20,GB20,true,Standard VAT or upload an .xlsx/.csv file." },
      { status: 400 },
    );
  }

  const dedupedRules = Array.from(
    new Map(importedRules.map((rule) => [`${rule.countryCode}_${rule.taxCode}`, rule])).values(),
  );
  const rules = await repository.upsertVatRules({ rules: dedupedRules });

  return NextResponse.json({
    ok: true,
    importedCount: dedupedRules.length,
    rules,
  });
}
