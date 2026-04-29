"use client";
import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { GlCodeRule } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function GlRuleManager({ initialRules }: { initialRules: GlCodeRule[] }) {
  const [rules, setRules] = useState<GlCodeRule[]>(initialRules);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const sortedRules = useMemo(
    () =>
      [...rules].sort((left, right) => {
        if (left.priority === right.priority) {
          return left.glCode.localeCompare(right.glCode);
        }

        return left.priority - right.priority;
      }),
    [rules],
  );

  function updateRule(ruleId: string, field: keyof GlCodeRule, value: string) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              [field]: field === "priority" ? Number(value || 0) : value,
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
        id: `gl_${crypto.randomUUID()}`,
        glCode: "",
        label: "",
        supplierPattern: "",
        keywordPattern: "",
        priority: current.length + 1,
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
      const response = await fetch("/api/settings/gl-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules
            .filter((rule) => rule.glCode.trim() && rule.label.trim())
            .map((rule) => ({
              glCode: rule.glCode.trim(),
              label: rule.label.trim(),
              supplierPattern: rule.supplierPattern?.trim() || undefined,
              keywordPattern: rule.keywordPattern?.trim() || undefined,
              priority: Number.isFinite(rule.priority) ? rule.priority : 100,
            })),
        }),
      });

      if (response.ok) {
        setMessage("GL rules saved.");
        toast({ variant: "success", title: "GL rules saved" });
      } else {
        setMessage("Could not save GL rules.");
        toast({ variant: "error", title: "Save failed", description: "Could not save GL rules." });
      }
    });
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">GL rules</h2>
        </div>
        <Button type="button" variant="secondary" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
      </div>

      <div className="space-y-3">
        {sortedRules.length === 0 ? (
          <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
            No GL rules yet. Import a list or add one manually.
          </p>
        ) : (
          sortedRules.map((rule) => (
            <div key={rule.id} className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 xl:grid-cols-[140px_1fr_1fr_1fr_110px_auto]">
              <Input
                value={rule.glCode}
                onChange={(event) => updateRule(rule.id, "glCode", event.target.value)}
                placeholder="650060"
              />
              <Input
                value={rule.label}
                onChange={(event) => updateRule(rule.id, "label", event.target.value)}
                placeholder="Travel expenses"
              />
              <Input
                value={rule.supplierPattern || ""}
                onChange={(event) => updateRule(rule.id, "supplierPattern", event.target.value)}
                placeholder="Supplier pattern"
              />
              <Input
                value={rule.keywordPattern || ""}
                onChange={(event) => updateRule(rule.id, "keywordPattern", event.target.value)}
                placeholder="Keyword pattern"
              />
              <Input
                type="number"
                value={String(rule.priority)}
                onChange={(event) => updateRule(rule.id, "priority", event.target.value)}
                placeholder="Priority"
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
          {pending ? "Saving..." : "Save GL rules"}
        </Button>
      </div>
    </Card>
  );
}
