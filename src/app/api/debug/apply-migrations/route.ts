import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/data/prisma";

export async function GET() {
  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Prisma client not initialized (maybe in demo mode?)" }, { status: 500 });
  }

  const results: string[] = [];

  try {
    const columns = [
      { name: "slug", type: "TEXT", populate: "LOWER(REGEXP_REPLACE(category, '[^a-zA-Z0-9]+', '-', 'g'))", constraints: "SET NOT NULL" },
      { name: "description", type: "TEXT" },
      { name: "section", type: "TEXT", default: "'Other & Special'" },
      { name: "isSystemDefault", type: "BOOLEAN", default: "true" },
      { name: "isVisible", type: "BOOLEAN", default: "true" },
      { name: "sortOrder", type: "INTEGER", default: "1000" }
    ];

    for (const col of columns) {
      const columnExists: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'CategoryRule' AND column_name = '${col.name}';
      `);

      if (columnExists.length === 0) {
        results.push(`Column '${col.name}' is missing. Adding it now...`);
        let alterQuery = `ALTER TABLE "CategoryRule" ADD COLUMN "${col.name}" ${col.type}`;
        if (col.default) alterQuery += ` DEFAULT ${col.default}`;
        await prisma.$executeRawUnsafe(alterQuery + ";");
        
        if (col.populate) {
          results.push(`Populating '${col.name}'...`);
          await prisma.$executeRawUnsafe(`UPDATE "CategoryRule" SET "${col.name}" = ${col.populate} WHERE "${col.name}" IS NULL;`);
        }
        
        if (col.constraints) {
          results.push(`Applying constraints to '${col.name}'...`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "CategoryRule" ALTER COLUMN "${col.name}" ${col.constraints};`);
        }
        results.push(`Column '${col.name}' added successfully.`);
      } else {
        results.push(`Column '${col.name}' already exists.`);
      }
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
