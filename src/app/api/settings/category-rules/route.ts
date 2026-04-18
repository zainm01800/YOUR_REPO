import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";

const categoryRuleSchema = z.object({
  id: z.string(),
  category: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  section: z.enum([
    "Income",
    "Cost of Sales",
    "Travel & Vehicle",
    "Office & Admin",
    "Marketing & Sales",
    "Financial / Finance Costs",
    "Staff & Payroll",
    "Property & Premises",
    "Tax & Compliance",
    "Equity & Owner Items",
    "Assets, Liabilities & Transfers",
    "Other & Special",
  ]),
  supplierPattern: z.string().optional(),
  keywordPattern: z.string().optional(),
  priority: z.number().int().min(1).max(999),
  accountType: z.enum(["income", "expense", "asset", "liability", "equity"]),
  statementType: z.enum(["p_and_l", "balance_sheet", "equity_movement", "tax_control"]),
  reportingBucket: z.string().min(1),
  defaultTaxTreatment: z.enum([
    "standard_rated",
    "reduced_rated",
    "zero_rated",
    "exempt",
    "outside_scope",
    "no_vat",
    "reverse_charge",
    "non_recoverable",
  ]),
  defaultVatRate: z.number().min(0).max(100),
  defaultVatRecoverable: z.boolean(),
  glCode: z.string().optional(),
  isSystemDefault: z.boolean().default(true),
  isActive: z.boolean(),
  isVisible: z.boolean(),
  allowableForTax: z.boolean().default(true),
  allowablePercentage: z.number().min(0).max(100).default(100),
  sortOrder: z.number().int().min(1).max(9999),
});

const bodySchema = z.object({
  rules: z.array(categoryRuleSchema),
});

export async function GET() {
  try {
    const repository = await getRepository();
    const rules = await repository.getCategoryRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[category-rules GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const repository = await getRepository();
    const normalizedRules = parsed.data.rules.map(r => ({
      ...r,
      category: r.category.trim(),
      slug: r.slug.trim(),
    }));
    const rules = await repository.replaceAllCategoryRules({ rules: normalizedRules });
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[category-rules PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
