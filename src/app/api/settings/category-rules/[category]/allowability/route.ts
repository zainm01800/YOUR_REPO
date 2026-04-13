import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const body = await request.json();

    if (typeof body.allowableForTax !== "boolean") {
      return NextResponse.json(
        { error: "allowableForTax must be a boolean" },
        { status: 400 }
      );
    }

    const repository = await getRepository();
    const rules = await repository.getCategoryRules();
    
    // Decode the URL param which could be "Travel %26 Vehicle"
    const decodedCategory = decodeURIComponent(category);

    let updated = false;
    const updatedRules = rules.map((rule) => {
      if (rule.category === decodedCategory) {
        updated = true;
        return { ...rule, allowableForTax: body.allowableForTax };
      }
      return rule;
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    await repository.replaceAllCategoryRules({ rules: updatedRules });

    return NextResponse.json({ success: true, allowableForTax: body.allowableForTax });
  } catch (error) {
    console.error(`[category rule allowability PATCH] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
