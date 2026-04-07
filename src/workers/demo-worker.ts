import { demoStore } from "@/lib/demo/demo-store";
import { processRun } from "@/lib/reconciliation/process-run";

async function main() {
  const run = demoStore.runs[0];
  const output = processRun(
    run,
    run.documents,
    demoStore.vatRules,
    demoStore.glRules,
  );

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        status: output.run.status,
        summary: output.summary,
      },
      null,
      2,
    ),
  );
}

main();
