"use client";

import { useState } from "react";
import type { ReviewRow } from "@/lib/domain/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MatchStatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function InlineCellInput({
  value,
  onCommit,
  type = "text",
  className,
}: {
  value?: string | number;
  onCommit: (nextValue: string) => void;
  type?: "text" | "number" | "date";
  className?: string;
}) {
  const [draft, setDraft] = useState(value?.toString() || "");

  function commit() {
    if (draft !== (value?.toString() || "")) {
      onCommit(draft);
    }
  }

  return (
    <Input
      type={type}
      value={draft}
      className={className || "h-9 rounded-xl px-3"}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function ReviewTable({
  rows,
  selectedRowId,
  onSelectRow,
  onEditField,
  pending,
}: {
  rows: ReviewRow[];
  selectedRowId?: string;
  onSelectRow: (rowId: string) => void;
  onEditField: (rowId: string, field: string, value: string) => void;
  pending?: boolean;
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
                <tr
                  key={row.id}
                  className={`align-top transition ${
                    row.id === selectedRowId
                      ? "bg-[var(--color-accent-soft)]/45"
                      : "hover:bg-[var(--color-panel)]/70"
                  }`}
                  onClick={() => onSelectRow(row.id)}
                >
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <InlineCellInput
                        key={`${row.id}_supplier_${row.supplier}`}
                        value={row.supplier}
                        onCommit={(value) => onEditField(row.id, "supplier", value)}
                        className="h-9 rounded-xl px-3 font-semibold"
                      />
                      <InlineCellInput
                        key={`${row.id}_description_${row.originalDescription}`}
                        value={row.originalDescription}
                        onCommit={(value) =>
                          onEditField(row.id, "originalDescription", value)
                        }
                        className="h-9 rounded-xl px-3 text-xs"
                      />
                    </div>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--color-muted-foreground)]">
                      Click anywhere on the row to open its detail panel.
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[var(--color-foreground)]">
                    <InlineCellInput
                      key={`${row.id}_gross_${row.gross ?? ""}`}
                      type="number"
                      value={row.gross ?? ""}
                      onCommit={(value) => onEditField(row.id, "gross", value)}
                    />
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {row.gross !== undefined
                        ? formatCurrency(row.gross, row.currency)
                        : row.currency}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <InlineCellInput
                      key={`${row.id}_vat_${row.vat ?? ""}`}
                      type="number"
                      value={row.vat ?? ""}
                      onCommit={(value) => onEditField(row.id, "vat", value)}
                    />
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
                    <div className="space-y-2">
                      <InlineCellInput
                        key={`${row.id}_vatcode_${row.vatCode || ""}`}
                        value={row.vatCode || ""}
                        onCommit={(value) => onEditField(row.id, "vatCode", value)}
                      />
                      <InlineCellInput
                        key={`${row.id}_glcode_${row.glCode || ""}`}
                        value={row.glCode || ""}
                        onCommit={(value) => onEditField(row.id, "glCode", value)}
                      />
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
      {pending ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
          Saving review changes...
        </div>
      ) : null}
    </Card>
  );
}
