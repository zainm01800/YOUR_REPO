"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RuleImportCard({
  title,
  description,
  endpoint,
  exampleLines,
  helperText,
}: {
  title: string;
  description: string;
  endpoint: string;
  exampleLines: string[];
  helperText: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleImport(formData: FormData) {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      importedCount?: number;
    };

    if (!response.ok) {
      setMessage(payload.error || "Import failed.");
      return;
    }

    setMessage(`Imported ${payload.importedCount || 0} row${payload.importedCount === 1 ? "" : "s"}.`);
    setNotes("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Paste rows
        </span>
        <textarea
          className="min-h-[160px] w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)]"
          placeholder={exampleLines.join("\n")}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Or upload .xlsx / .csv
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Upload className="h-4 w-4" />
          {fileName || "Choose an Excel or CSV file"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(event) => {
            const nextFile = event.target.files?.[0];
            setFileName(nextFile?.name || "");
          }}
        />
      </div>

      <div className="rounded-2xl bg-[var(--color-panel)] p-4 text-sm text-[var(--color-muted-foreground)]">
        <div className="font-semibold text-[var(--color-foreground)]">Expected format</div>
        <div className="mt-2 whitespace-pre-line">{helperText}</div>
      </div>

      {message ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const formData = new FormData();
              formData.append("notes", notes);
              const file = fileInputRef.current?.files?.[0];
              if (file) {
                formData.append("file", file);
              }
              await handleImport(formData);
            })
          }
        >
          {pending ? "Importing..." : "Import rules"}
        </Button>
      </div>
    </Card>
  );
}
