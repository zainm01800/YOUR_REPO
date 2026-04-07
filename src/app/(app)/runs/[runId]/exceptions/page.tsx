import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRepository } from "@/lib/data";

export default async function ExceptionsPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const repository = getRepository();
  const [run, rows] = await Promise.all([
    repository.getRun(runId),
    repository.getRunRows(runId),
  ]);

  if (!run) {
    notFound();
  }

  const exceptionRows = rows.filter((row) => row.exceptions.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Exceptions"
        title="Everything that needs finance attention"
        description="Make issues obvious instead of hiding them inside a spreadsheet export."
        actions={
          <Link href={`/runs/${run.id}/review`}>
            <Button>Back to review</Button>
          </Link>
        }
      />

      <div className="grid gap-5">
        {exceptionRows.map((row) => (
          <Card key={row.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {row.supplier}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {row.originalDescription}
                </p>
              </div>
              <Link href={`/runs/${run.id}/review?row=${row.id}`}>
                <Button variant="secondary">Open row</Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.exceptions.map((exception) => (
                <Badge
                  key={`${row.id}_${exception.code}`}
                  tone={exception.severity === "high" ? "danger" : "warning"}
                >
                  {exception.message}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

