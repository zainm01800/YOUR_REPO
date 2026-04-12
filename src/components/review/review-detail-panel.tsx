"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ReconciliationRun, ReviewRow } from "@/lib/domain/types";
import { europeanCountryOptions } from "@/lib/run-config";
import { isVatClaimableForRun } from "@/lib/tax/rules-engine";
import { formatCurrency, formatDate } from "@/lib/utils";

const reviewCountryOptions = [
  ...europeanCountryOptions,
  { code: "US", label: "United States", currency: "USD" },
  { code: "AU", label: "Australia", currency: "AUD" },
  { code: "CA", label: "Canada", currency: "CAD" },
  { code: "NZ", label: "New Zealand", currency: "NZD" },
  { code: "CH", label: "Switzerland", currency: "CHF" },
  { code: "NO", label: "Norway", currency: "NOK" },
].filter(
  (option, index, options) => options.findIndex((candidate) => candidate.code === option.code) === index,
);

function formatOptionalCurrency(value?: number, currency?: string) {
  if (value === undefined || !currency) {
    return "Pending";
  }

  return formatCurrency(value, currency);
}

export function ReviewDetailPanel({
  row,
  run,
  runId,
  onRunMutated,
}: {
  row: ReviewRow;
  run: ReconciliationRun;
  runId: string;
  onRunMutated?: (payload: {
    rows?: ReviewRow[];
    run?: ReconciliationRun | null;
  }) => void;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [countryCode, setCountryCode] = useState("");
  const [countrySaveMessage, setCountrySaveMessage] = useState<string | null>(null);
  const [countryPending, startCountryTransition] = useTransition();

  const document = run.documents.find((candidate) => candidate.id === row.documentId);
  const transaction = run.transactions.find(
    (candidate) => candidate.id === row.transactionId,
  );

  useEffect(() => {
    setCountryCode(document?.countryCode || "");
  }, [document?.countryCode]);

  const vatClaimable = isVatClaimableForRun(
    document,
    run.countryProfile,
  );
  const displayGross = row.grossInRunCurrency ?? row.gross;
  const displayNet = row.netInRunCurrency ?? row.net;
  const displayVat = row.vatInRunCurrency ?? row.vat;
  const displayCurrency =
    row.grossInRunCurrency !== undefined ||
    row.netInRunCurrency !== undefined ||
    row.vatInRunCurrency !== undefined
      ? row.runCurrency
      : row.currency;

  async function handleExplain() {
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: row.supplier,
          exceptions: row.exceptions,
          gross: row.gross,
          net: row.net,
          vat: row.vat,
          vatCode: row.vatCode,
          glCode: row.glCode,
          currency: row.currency,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? data.error ?? "No explanation returned.");
    } catch {
      setExplanation("Failed to reach AI service.");
    } finally {
      setExplaining(false);
    }
  }

  async function handleUpdateCountry() {
    if (!document) {
      return;
    }

    setCountrySaveMessage(null);
    const response = await fetch(`/api/runs/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        rowId: row.id,
        actionType: "edit_field",
        field: "countryCode",
        value: countryCode,
      }),
    });

    if (!response.ok) {
      setCountrySaveMessage("Could not update the invoice country.");
      return;
    }

    const payload = (await response.json()) as {
      rows?: ReviewRow[];
      run?: ReconciliationRun | null;
    };
    onRunMutated?.(payload);
    setCountrySaveMessage("Invoice country updated.");
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Transaction detail
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
            {transaction?.merchant || row.supplier}
          </h3>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Amount</dt>
            <dd className="mt-1 font-semibold">
              {formatCurrency(transaction?.amount || row.gross || 0, transaction?.currency || row.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Date</dt>
            <dd className="mt-1 font-semibold">
              {formatDate(transaction?.transactionDate || row.date)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Employee</dt>
            <dd className="mt-1 font-semibold">{transaction?.employee || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Reference</dt>
            <dd className="mt-1 font-semibold">{transaction?.reference || "None"}</dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Calculation trace
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
              How this row was calculated
            </h3>
          </div>
          <Badge tone={vatClaimable ? "success" : "warning"}>
            {vatClaimable ? "VAT claimable" : "VAT not claimable"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Invoice country</dt>
            <dd className="mt-1 font-semibold">{document?.countryCode || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Run country</dt>
            <dd className="mt-1 font-semibold">{run.countryProfile || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Invoice currency</dt>
            <dd className="mt-1 font-semibold">{row.currency || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Run currency</dt>
            <dd className="mt-1 font-semibold">{row.runCurrency || run.defaultCurrency || "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Original invoice total</dt>
            <dd className="mt-1 font-semibold">
              {formatOptionalCurrency(row.originalAmount || row.gross, row.originalCurrency || row.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">FX rate used</dt>
            <dd className="mt-1 font-semibold">
              {row.fxRate !== undefined ? `1 ${row.runCurrency} = ${row.fxRate} ${row.currency}` : "No conversion"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Displayed gross</dt>
            <dd className="mt-1 font-semibold">
              {formatOptionalCurrency(displayGross, displayCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Displayed net</dt>
            <dd className="mt-1 font-semibold">
              {formatOptionalCurrency(displayNet, displayCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Displayed VAT</dt>
            <dd className="mt-1 font-semibold">
              {formatOptionalCurrency(displayVat, displayCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted-foreground)]">Reason</dt>
            <dd className="mt-1 font-semibold">
              {vatClaimable
                ? "Invoice location and run location allow VAT recovery."
                : "Invoice is treated as outside the claimable VAT location for this run."}
            </dd>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Invoice country override
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
            Correct VAT location when extraction is wrong
          </h3>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium">Seller / invoice country</span>
          <Select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
            <option value="">Unknown</option>
            {reviewCountryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        {countrySaveMessage ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">{countrySaveMessage}</p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          disabled={countryPending || !document}
          onClick={() => startCountryTransition(async () => {
            await handleUpdateCountry();
          })}
        >
          {countryPending ? "Updating country..." : "Update invoice country"}
        </Button>
      </Card>

      {row.exceptions.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Exceptions
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
                {row.exceptions.length} flag{row.exceptions.length !== 1 ? "s" : ""}
              </h3>
            </div>
            <button
              type="button"
              disabled={explaining}
              onClick={handleExplain}
              className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {explaining ? "Explaining..." : "Explain with AI"}
            </button>
          </div>
          <div className="space-y-2">
            {row.exceptions.map((ex, index) => (
              <div key={`${ex.code}_${index}`} className="rounded-2xl bg-[var(--color-panel)] px-4 py-3 text-sm">
                <div className="font-semibold text-[var(--color-foreground)]">{ex.code.replace(/_/g, " ")}</div>
                <div className="mt-0.5 text-[var(--color-muted-foreground)]">{ex.message}</div>
              </div>
            ))}
          </div>
          {explanation && (
            <div className="rounded-2xl border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] p-4 text-sm leading-6 text-[var(--color-foreground)]">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3" />
                AI explanation
              </div>
              {explanation}
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Document preview
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
              {document?.fileName || "Missing receipt"}
            </h3>
          </div>
          {document ? <Badge tone="info">{Math.round(document.confidence * 100)}% OCR</Badge> : null}
        </div>
        {document ? (
          <>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Supplier</dt>
                <dd className="mt-1 font-semibold">{row.supplier}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Issue date</dt>
                <dd className="mt-1 font-semibold">{formatDate(row.date || document.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Gross</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(row.gross ?? document.gross ?? 0, row.currency || document.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted-foreground)]">VAT</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(row.vat ?? document.vat ?? 0, row.currency || document.currency)}
                </dd>
              </div>
            </dl>
            <div className="rounded-2xl bg-[var(--color-panel)] p-4 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {document.rawExtractedText || "No raw text available for this preview."}
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            No document is currently matched to this transaction.
          </p>
        )}
      </Card>
    </div>
  );
}
