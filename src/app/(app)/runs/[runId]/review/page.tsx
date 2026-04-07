import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewActions } from "@/components/review/review-actions";
import { ReviewDetailPanel } from "@/components/review/review-detail-panel";
import { ReviewTable } from "@/components/review/review-table";
import { getRepository } from "@/lib/data";
import { buildRunSummary } from "@/lib/reconciliation/summary";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ row?: string; filter?: string }>;
}) {
  const { runId } = await params;
  const { row, filter } = await searchParams;
  const repository = getRepository();
  const [run, rows] = await Promise.all([
    repository.getRun(runId),
    repository.getRunRows(runId),
  ]);

  if (!run) {
    notFound();
  }

  const filteredRows = rows.filter((candidate) => {
    switch (filter) {
      case "unmatched":
        return candidate.matchStatus === "unmatched";
      case "duplicates":
        return candidate.matchStatus === "duplicate_suspected";
      case "missing-gl":
        return candidate.exceptions.some((exception) => exception.code === "missing_gl_code");
      case "missing-vat":
        return candidate.exceptions.some((exception) => exception.code === "missing_vat_code");
      case "low-confidence":
        return candidate.exceptions.some(
          (exception) => exception.code === "low_confidence_extraction",
        );
      case "mismatched":
        return candidate.exceptions.some((exception) => exception.code === "amount_mismatch");
      default:
        return true;
    }
  });

  const selectedRow = filteredRows.find((candidate) => candidate.id === row) || filteredRows[0] || rows[0];
  const summary = buildRunSummary(rows);
  const filterLinks = [
    { label: "All", value: "all" },
    { label: "Unmatched", value: "unmatched" },
    { label: "Mismatched", value: "mismatched" },
    { label: "Duplicates", value: "duplicates" },
    { label: "Low confidence", value: "low-confidence" },
    { label: "Missing VAT", value: "missing-vat" },
    { label: "Missing GL", value: "missing-gl" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Review Workspace"
        title="Approve what is clean and work exceptions in one place"
        description="This is the core trust layer of the product. Review rows, preview documents, adjust codes, and keep a clear audit trail."
        actions={
          <>
            <Link href={`/runs/${run.id}/exceptions`}>
              <Button variant="secondary">Exceptions only</Button>
            </Link>
            <Link href={`/runs/${run.id}/export`}>
              <Button>Export run</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <div className="text-sm text-[var(--color-muted-foreground)]">Matched</div>
          <div className="mt-2 text-3xl font-semibold">{summary.matched}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--color-muted-foreground)]">Needs review</div>
          <div className="mt-2 text-3xl font-semibold">{summary.exceptions}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--color-muted-foreground)]">Duplicates</div>
          <div className="mt-2 text-3xl font-semibold">{summary.duplicates}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--color-muted-foreground)]">Unmatched</div>
          <div className="mt-2 text-3xl font-semibold">{summary.unmatched}</div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Card className="flex flex-wrap gap-3">
            {filterLinks.map((item) => (
              <Link
                key={item.value}
                href={`/runs/${run.id}/review${item.value === "all" ? "" : `?filter=${item.value}`}`}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  (filter || "all") === item.value
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "bg-[var(--color-panel)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </Card>
          <ReviewTable rows={filteredRows} runId={run.id} />
        </div>
        <div className="space-y-5">
          {selectedRow ? (
            <>
              <ReviewDetailPanel row={selectedRow} run={run} />
              <Card className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Manual overrides</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    Finance remains in control of approvals, VAT coding, GL coding, and export inclusion.
                  </p>
                </div>
                <ReviewActions runId={run.id} row={selectedRow} />
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                No rows match the current filter.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
