
import { getRepository } from "./src/lib/data";

async function main() {
  try {
    console.log("Checking repository...");
    const repository = getRepository();
    
    console.log("Fetching workspace...");
    const workspace = await repository.getWorkspace();
    console.log("Workspace fetched:", workspace.name);
    
    console.log("Fetching dashboard snapshot...");
    const snapshot = await repository.getDashboardSnapshot();
    console.log("Snapshot fetched. Run count:", snapshot.runs.length);
    
    console.log("Fetching runs with transactions...");
    const runs = await repository.getRunsWithTransactions();
    console.log("Runs fetched:", runs.length);
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
