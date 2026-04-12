"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { VatRule } from "@/lib/domain/types";
import {
  MASTER_VAT_RATES,
  RATE_TYPE_LABELS,
  REGION_ORDER,
  REGION_LABELS,
  vatRateKey,
  type MasterVatRate,
} from "@/lib/vat/country-rates";
import { Button } from "@/components/ui/button";

const RATE_TYPE_COLORS: Record<MasterVatRate["type"], string> = {
  standard: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  reduced: "bg-emerald-50 text-emerald-700",
  "super-reduced": "bg-amber-50 text-amber-700",
  zero: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)]",
  exempt: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)]",
};

/** All unique countries from master list, sorted alphabetically within region order */
const ALL_COUNTRIES: { code: string; name: string; region: MasterVatRate["region"] }[] = (() => {
  const seen = new Set<string>();
  const result: { code: string; name: string; region: MasterVatRate["region"] }[] = [];
  for (const region of REGION_ORDER) {
    const inRegion = MASTER_VAT_RATES.filter((r) => r.region === region);
    const unique = new Map<string, string>();
    for (const r of inRegion) unique.set(r.countryCode, r.countryName);
    for (const [code, name] of unique) {
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ code, name, region });
      }
    }
  }
  return result;
})();

function buildEnabledKeys(rules: VatRule[]): Set<string> {
  return new Set(rules.map((r) => vatRateKey(r.countryCode, r.taxCode)));
}

export function CountryVatPicker({ initialRules }: { initialRules: VatRule[] }) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(() => buildEnabledKeys(initialRules));
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const countryRates = useMemo(
    () => MASTER_VAT_RATES.filter((r) => r.countryCode === selectedCountry),
    [selectedCountry],
  );

  /** Active rules across all countries — what the workspace currently has */
  const activeByCountry = useMemo(() => {
    const map = new Map<string, { name: string; codes: string[] }>();
    for (const rate of MASTER_VAT_RATES) {
      if (enabledKeys.has(vatRateKey(rate.countryCode, rate.taxCode))) {
        if (!map.has(rate.countryCode)) {
          map.set(rate.countryCode, { name: rate.countryName, codes: [] });
        }
        map.get(rate.countryCode)!.codes.push(rate.taxCode);
      }
    }
    return map;
  }, [enabledKeys]);

  function toggleRate(rate: MasterVatRate) {
    const key = vatRateKey(rate.countryCode, rate.taxCode);
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaveStatus("idle");
  }

  function toggleAllForCountry(enable: boolean) {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      for (const r of countryRates) {
        const key = vatRateKey(r.countryCode, r.taxCode);
        if (enable) next.add(key);
        else next.delete(key);
      }
      return next;
    });
    setSaveStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      const enabledRates = MASTER_VAT_RATES.filter((r) =>
        enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)),
      );
      const res = await fetch("/api/settings/vat-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: enabledRates.map((r) => ({
            countryCode: r.countryCode,
            rate: r.rate,
            taxCode: r.taxCode,
            recoverable: r.recoverable,
            description: r.description,
          })),
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 3000);
    });
  }

  const allEnabled = countryRates.length > 0 && countryRates.every((r) => enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)));
  const noneEnabled = countryRates.length > 0 && countryRates.every((r) => !enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">VAT rules</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Select a country to enable or disable its rates. Enabled rates are recognised and calculated during reconciliation; disabled rates default to £0 claimable.
          </p>
        </div>
      </div>

      {/* Country selector */}
      <div className="relative">
        <select
          value={selectedCountry}
          onChange={(e) => { setSelectedCountry(e.target.value); setSaveStatus("idle"); }}
          className="h-10 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] pl-4 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">— Select a country —</option>
          {REGION_ORDER.map((region) => {
            const countries = ALL_COUNTRIES.filter((c) => c.region === region);
            if (countries.length === 0) return null;
            return (
              <optgroup key={region} label={REGION_LABELS[region]}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                    {activeByCountry.has(c.code)
                      ? ` · ${activeByCountry.get(c.code)!.codes.length} active`
                      : ""}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      </div>

      {/* Rate toggles for selected country */}
      {selectedCountry && countryRates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              {ALL_COUNTRIES.find((c) => c.code === selectedCountry)?.name} VAT rates
            </span>
            <button
              type="button"
              onClick={() => toggleAllForCountry(noneEnabled || !allEnabled)}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              {allEnabled ? "Disable all" : "Enable all"}
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            {countryRates.map((rate, i) => {
              const key = vatRateKey(rate.countryCode, rate.taxCode);
              const isEnabled = enabledKeys.has(key);
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-accent-soft)] ${
                    i > 0 ? "border-t border-[var(--color-border)]" : ""
                  } ${isEnabled ? "bg-white" : "bg-[var(--color-panel)]"}`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleRate(rate)}
                    className="h-4 w-4 cursor-pointer rounded accent-[var(--color-accent)]"
                  />
                  <span className="w-12 shrink-0 font-mono text-sm font-semibold">
                    {rate.rate % 1 === 0 ? `${rate.rate}%` : `${rate.rate.toFixed(1)}%`}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${RATE_TYPE_COLORS[rate.type]}`}>
                    {RATE_TYPE_LABELS[rate.type]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted-foreground)]">
                    {rate.description}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[var(--color-muted-foreground)]">
                    {rate.taxCode}
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${isEnabled ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
                    {isEnabled ? "Claimable" : "Not claimed"}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm font-medium text-[var(--color-danger)]">Save failed</span>
            )}
            <Button type="button" onClick={handleSave} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* Active rules summary */}
      {activeByCountry.size > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Currently active ({activeByCountry.size} {activeByCountry.size === 1 ? "country" : "countries"})
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(activeByCountry.entries()).map(([code, { name, codes }]) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCountry(code)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] ${
                  selectedCountry === code
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-foreground)]"
                }`}
              >
                <span className="font-semibold">{code}</span>
                <span className="text-[var(--color-muted-foreground)]">·</span>
                <span>{codes.length} rate{codes.length !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeByCountry.size === 0 && !selectedCountry && (
        <p className="rounded-2xl bg-[var(--color-panel)] p-5 text-sm text-[var(--color-muted-foreground)]">
          No VAT rules active. Select a country above to enable rates for reconciliation.
        </p>
      )}
    </div>
  );
}
