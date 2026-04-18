const { getPrismaClient } = require("./src/lib/data/prisma");

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.error("No prisma client");
    return;
  }

  const categories = await prisma.categoryRule.findMany({
    where: { isActive: true, isVisible: true },
  });

  console.log("Active Visible Categories:", JSON.stringify(categories, null, 2));

  const transactions = await prisma.transaction.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  console.log("Sample Transactions:", JSON.stringify(transactions, null, 2));
  
  const bankTransactions = await prisma.bankTransaction.findMany({
    take: 10,
    orderBy: { importedAt: "desc" },
  });
  
  console.log("Sample Bank Transactions:", JSON.stringify(bankTransactions, null, 2));
}

main().catch(console.error);
