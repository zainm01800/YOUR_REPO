import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/data/prisma";

export async function GET() {
  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Prisma client not initialized (maybe in demo mode?)" }, { status: 500 });
  }

  const results: string[] = [];

  try {
    results.push("Checking for 'slug' column in 'CategoryRule'...");
    
    // 1. Check if column exists
    const columnExists: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'CategoryRule' AND column_name = 'slug';
    `);

    if (columnExists.length === 0) {
      results.push("Column 'slug' is missing. Adding it now...");
      
      // 2. Add the column
      await prisma.$executeRawUnsafe('ALTER TABLE "CategoryRule" ADD COLUMN "slug" TEXT;');
      results.push("Column added.");

      // 3. Populate existing rows with slugs
      results.push("Populating slugs from category names...");
      await prisma.$executeRawUnsafe(`
        UPDATE "CategoryRule" 
        SET "slug" = LOWER(REGEXP_REPLACE(category, '[^a-zA-Z0-9]+', '-', 'g'))
        WHERE "slug" IS NULL;
      `);
      results.push("Slugs populated.");

      // 4. Set NOT NULL and UNIQUE constraints if needed
      // (This is safer if we just added it)
      await prisma.$executeRawUnsafe('ALTER TABLE "CategoryRule" ALTER COLUMN "slug" SET NOT NULL;');
      results.push("Set NOT NULL constraint.");
    } else {
      results.push("Column 'slug' already exists. No changes needed.");
    }

    return NextResponse.json({
      success: true,
      log: results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Migration Fix Error]", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      log: results,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
