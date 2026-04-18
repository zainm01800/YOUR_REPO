// check-duplicates.js
const { getPrismaClient } = require("./src/lib/data/prisma");

async function main() {
  const prisma = getPrismaClient();
  const rules = await prisma.categoryRule.findMany({
    where: { isActive: true },
    select: { id: true, category: true, section: true }
  });

  const counts = {};
  rules.forEach(r => {
    const key = r.category;
    if (!counts[key]) counts[key] = [];
    counts[key].push(r.id);
  });

  const duplicates = Object.entries(counts).filter(([_, ids]) => ids.length > 1);
  console.log("DUPLICATES FOUND:", JSON.stringify(duplicates, null, 2));
}

main().catch(console.error);
