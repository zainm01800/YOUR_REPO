"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MappingGrid } from "@/components/run-flow/mapping-grid";
import { detectDefaultMapping, parseTransactionFile } from "@/lib/transactions/parser";

export function BankStatementImportForm({
  defaultCurrency,
}: {
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(file && headers.length > 0),
    [file, headers.length],
  );

  async function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setError(null);

    if (!nextFile) {
      setHeaders([]);
      setColumnMappings({});
      return;
    }

    try {
      const parsed = parseTransactionFile(await nextFile.arrayBuffer());
      setHeaders(parsed.headers);
      setColumnMappings(detectDefaultMapping(parsed.headers));
      if (!name.trim()) {
        setName(nextFile.name.replace(/\.[^.]+$/, ""));
      }
    } catch {
      setError("That file could not be parsed. Try CSV or XLSX.");
      setHeaders([]);
      setColumnMappings({});
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name.trim() || file.name.replace(/\.[^.]+$/, ""));
    formData.set("defaultCurrency", defaultCurrency);
    formData.set("statementFile", file);
    formData.set("columnMappings", JSON.stringify(columnMappings));

    try {
      const response = await fetch("/api/bank-statements", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Import failed.");
      }

      const payload = (await response.json()) as { redirectTo: string };
      router.push(payload.redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Import failed.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Import a bank statement</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Upload a CSV or Excel statement once, map the columns if needed, and reuse those transactions across reconciliation runs.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium">Statement name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. October 2025 Revolut statement" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Statement file</span>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <span className="text-xs leading-5 text-[var(--color-muted-foreground)]">
              Auto-detection works for most exports. You can override the column mapping before import.
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={!canSubmit || isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isPending ? "Importing..." : "Import statement"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-5">
        <MappingGrid
          headers={headers}
          selected={columnMappings}
          onChange={(field, value) =>
            setColumnMappings((current) => ({
              ...current,
              [field]: value,
            }))
          }
        />
        <Card>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Imported statements become a reusable source module for future reconciliation runs. The transactions will stay available centrally even after the run is closed or exported.
          </p>
        </Card>
      </div>
    </div>
  );
}
