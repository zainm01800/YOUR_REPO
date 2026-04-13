"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BankSourceMode, BankStatementSummary, ReviewRow } from "@/lib/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function BankSourceCard({
  runId,
  bankStatements,
  currentBankStatementId,
  currentBankSourceMode,
  currentBankSourceLabel,
  onAttached,
}: {
  runId: string;
  bankStatements: BankStatementSummary[];
  currentBankStatementId?: string;
  currentBankSourceMode?: BankSourceMode;
  currentBankSourceLabel?: string;
  onAttached: (payload: { rows: ReviewRow[]; run: { bankStatementId?: string; bankSourceMode?: BankSourceMode; bankSourceLabel?: string; transactionFileName?: string } }) => void;
}) {
  const [mode, setMode] = useState<BankSourceMode>(currentBankSourceMode || (bankStatements.length > 0 ? "statement" : "later"));
  const [statementId, setStatementId] = useState(currentBankStatementId || bankStatements[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAttach() {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(`/api/runs/${runId}/bank-source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankSourceMode: mode,
            bankStatementId: statementId || undefined,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Could not attach that bank source.");
        }

        const payload = (await response.json()) as {
          rows: ReviewRow[];
          run: {
            bankStatementId?: string;
            bankSourceMode?: BankSourceMode;
            bankSourceLabel?: string;
            transactionFileName?: string;
          };
        };
        onAttached(payload);
      } catch (attachError) {
        setError(
          attachError instanceof Error
            ? attachError.message
            : "Could not attach that bank source.",
        );
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Bank source
          </div>
          <h2 className="mt-2 text-xl font-semibold">Attach reusable bank data to this run</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Keep statements in the Bank Statements module, then pull that data into the run when you are ready to reconcile invoices against it.
          </p>
          {currentBankSourceLabel ? (
            <p className="mt-2 text-sm font-medium text-[var(--color-accent)]">
              Current source: {currentBankSourceLabel}
            </p>
          ) : null}
        </div>
        <Link href="/bank-statements/import">
          <Button type="button" variant="secondary">
            Import bank statement
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_auto]">
        <label className="space-y-2">
          <span className="text-sm font-medium">Source mode</span>
          <Select value={mode} onChange={(event) => setMode(event.target.value as BankSourceMode)}>
            {bankStatements.length > 0 ? (
              <option value="statement">Use a specific statement</option>
            ) : null}
            <option value="all_unreconciled">Use all unreconciled transactions</option>
            <option value="later">Choose later</option>
            <option value="skip">Skip bank linking for now</option>
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Statement</span>
          <Select
            value={statementId}
            onChange={(event) => setStatementId(event.target.value)}
            disabled={mode !== "statement"}
          >
            <option value="">Choose a statement</option>
            {bankStatements.map((statement) => (
              <option key={statement.id} value={statement.id}>
                {statement.name} · {statement.transactionCount} transactions
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-end">
          <Button type="button" className="w-full" disabled={pending || (mode === "statement" && !statementId)} onClick={handleAttach}>
            {pending ? "Attaching..." : "Attach source"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}
    </Card>
  );
}
