// diagnostic.js
const { getRepository } = require("./src/lib/data");

async function diagnose() {
  try {
    const repo = await getRepository();
    const settings = await repo.getSettingsSnapshot();
    const activeCategories = settings.categoryRules
      .filter((r) => r.isActive && r.isVisible);
    
    console.log("--- ACTIVE CATEGORIES ---");
    console.log(JSON.stringify(activeCategories.map(c => c.category), null, 2));

    const transactions = await repo.getPaginatedTransactions(0, 10);
    console.log("--- SAMPLE TRANSACTIONS ---");
    console.log(JSON.stringify(transactions.map(t => ({ 
      id: t.id, 
      merchant: t.merchant, 
      description: t.description,
      category: t.category 
    })), null, 2));

  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err);
  }
}

diagnose();
