import Link from "next/link";
import type { ReviewRow } from "@/lib/domain/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MatchStatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ReviewTable({
  rows,
  runId,
}: {
  rows: ReviewRow[];
  runId: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-panel)] text-left text-xs uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">VAT</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Codes</th>
              <th className="px-4 py-3">Exceptions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                  No rows match the current filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                      href={`/runs/${runId}/review?row=${row.id}`}
                    >
                      {row.supplier}
                    </Link>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {row.originalDescription}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[var(--color-foreground)]">
                    <div>{formatCurrency(row.gross || 0, row.currency)}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {row.currency}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>{row.vat ? formatCurrency(row.vat, row.currency) : "Pending"}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {row.vatPercent !== undefined ? formatPercent(row.vatPercent) : "No rate"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <MatchStatusPill status={row.matchStatus} />
                    <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      {Math.round(row.confidence * 100)}% extraction confidence
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-[var(--color-foreground)]">
                      VAT {row.vatCode || "Missing"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      GL {row.glCode || "Missing"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {row.exceptions.length === 0 ? (
                        <Badge tone="success">Clear</Badge>
                      ) : (
                        row.exceptions.map((exception) => (
                          <Badge
                            key={`${row.id}_${exception.code}`}
                            tone={
                              exception.severity === "high"
                                ? "danger"
                                : exception.severity === "medium"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {exception.code.replace(/_/g, " ")}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
