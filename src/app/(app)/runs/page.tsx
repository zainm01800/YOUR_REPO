import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { RunsTable } from "@/components/runs/runs-table";
import { getRepository } from "@/lib/data";

export default async function RunsPage() {
  const repository = getRepository();
  const runs = await repository.getRunSummaries();

  return (
    <>
      <PageHeader
        eyebrow="Reconciliation"
        title="All runs"
        description="Every reconciliation run stays available for review, re-export, and use in the Posting File Builder."
        actions={
          <Link href="/runs/new">
            <Button>New run</Button>
          </Link>
        }
      />

      <RunsTable runs={runs} />
    </>
  );
}
