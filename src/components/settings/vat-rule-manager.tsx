"use client";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { VatRule } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function VatRuleManager({ initialRules }: { initialRules: VatRule[] }) {
  const [rules, setRules] = useState<VatRule[]>(initialRules);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const sortedRules = useMemo(
    () =>
      [...rules].sort((left, right) => {
        if (left.countryCode === right.countryCode) {
          return left.rate - right.rate;
        }

        return left.countryCode.localeCompare(right.countryCode);
      }),
    [rules],
  );

  function updateRule(ruleId: string, field: keyof VatRule, value: string | boolean) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              [field]:
                field === "rate"
                  ? Number(value)
                  : field === "recoverable"
                    ? Boolean(value)
                    : value,
            }
          : rule,
      ),
    );
    setMessage(null);
  }

  function addRule() {
    setRules((current) => [
      ...current,
      {
        id: `vat_${crypto.randomUUID()}`,
        countryCode: "",
        rate: 0,
        taxCode: "",
        recoverable: true,
        description: "",
      },
    ]);
    setMessage(null);
  }

  function removeRule(ruleId: string) {
    setRules((current) => current.filter((rule) => rule.id !== ruleId));
    setMessage(null);
  }

  function saveRules() {
    startTransition(async () => {
      const response = await fetch("/api/settings/vat-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules
            .filter((rule) => rule.countryCode.trim() && rule.taxCode.trim())
            .map((rule) => ({
              countryCode: rule.countryCode.trim().toUpperCase(),
              rate: Number.isFinite(rule.rate) ? rule.rate : 0,
              taxCode: rule.taxCode.trim(),
              recoverable: rule.recoverable,
              description: rule.description.trim(),
            })),
        }),
      });

      setMessage(response.ok ? "VAT rules saved." : "Could not save VAT rules.");
    });
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">VAT rule table</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Edit or remove individual VAT mappings directly when imports need cleanup.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
      </div>

      <div className="space-y-3">
        {sortedRules.length === 0 ? (
          <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
            No VAT rules yet. Sync live rates, import a file, or add one manually.
          </p>
        ) : (
          sortedRules.map((rule) => (
            <div key={rule.id} className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 xl:grid-cols-[100px_120px_120px_140px_1fr_auto]">
              <Input
                value={rule.countryCode}
                onChange={(event) => updateRule(rule.id, "countryCode", event.target.value)}
                placeholder="GB"
              />
              <Input
                type="number"
                value={String(rule.rate)}
                onChange={(event) => updateRule(rule.id, "rate", event.target.value)}
                placeholder="20"
              />
              <Input
                value={rule.taxCode}
                onChange={(event) => updateRule(rule.id, "taxCode", event.target.value)}
                placeholder="GB20"
              />
              <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm">
                <input
                  type="checkbox"
                  checked={rule.recoverable}
                  onChange={(event) => updateRule(rule.id, "recoverable", event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Recoverable
              </label>
              <Input
                value={rule.description}
                onChange={(event) => updateRule(rule.id, "description", event.target.value)}
                placeholder="Standard UK VAT"
              />
              <Button
                type="button"
                variant="secondary"
                className="text-rose-700 hover:text-rose-800"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--color-muted-foreground)]">{message || " "}</span>
        <Button type="button" onClick={saveRules} disabled={pending}>
          {pending ? "Saving..." : "Save VAT rules"}
        </Button>
      </div>
    </Card>
  );
}
