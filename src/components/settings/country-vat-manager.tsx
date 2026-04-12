"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import type { VatRule } from "@/lib/domain/types";
import {
  MASTER_VAT_RATES,
  RATE_TYPE_LABELS,
  REGION_LABELS,
  REGION_ORDER,
  groupMasterRatesByRegion,
  vatRateKey,
  type MasterVatRate,
} from "@/lib/vat/country-rates";
import { Button } from "@/components/ui/button";

const RATE_TYPE_COLORS: Record<MasterVatRate["type"], string> = {
  standard: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]",
  reduced: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "super-reduced": "bg-amber-50 text-amber-700 border-amber-200",
  zero: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  exempt: "bg-[var(--color-panel)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
};

function buildEnabledKeys(vatRules: VatRule[]): Set<string> {
  return new Set(vatRules.map((r) => vatRateKey(r.countryCode, r.taxCode)));
}

export function CountryVatManager({ initialRules }: { initialRules: VatRule[] }) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(() =>
    buildEnabledKeys(initialRules),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(
    () => new Set(["Americas", "Asia-Pacific", "Middle East", "Africa"]),
  );
  const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => groupMasterRatesByRegion(), []);

  const filteredGrouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = new Map<MasterVatRate["region"], Map<string, MasterVatRate[]>>();

    for (const region of REGION_ORDER) {
      const countries = grouped.get(region);
      if (!countries) continue;
      if (regionFilter !== "all" && region !== regionFilter) continue;

      const filteredCountries = new Map<string, MasterVatRate[]>();
      for (const [code, rates] of countries) {
        const countryName = rates[0]?.countryName ?? code;
        if (
          !q ||
          countryName.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) ||
          rates.some(
            (r) =>
              r.taxCode.toLowerCase().includes(q) ||
              r.description.toLowerCase().includes(q),
          )
        ) {
          filteredCountries.set(code, rates);
        }
      }
      if (filteredCountries.size > 0) {
        result.set(region, filteredCountries);
      }
    }

    return result;
  }, [grouped, search, regionFilter]);

  const enabledCount = useMemo(() => enabledKeys.size, [enabledKeys]);
  const totalCount = MASTER_VAT_RATES.length;

  function toggleRate(rate: MasterVatRate) {
    const key = vatRateKey(rate.countryCode, rate.taxCode);
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setIsDirty(true);
    setSaveStatus("idle");
  }

  function toggleAllForCountry(rates: MasterVatRate[], enable: boolean) {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      for (const r of rates) {
        const key = vatRateKey(r.countryCode, r.taxCode);
        if (enable) next.add(key);
        else next.delete(key);
      }
      return next;
    });
    setIsDirty(true);
    setSaveStatus("idle");
  }

  function toggleRegion(region: string, collapseOpen: boolean) {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);
      if (collapseOpen) next.add(region);
      else next.delete(region);
      return next;
    });
  }

  function toggleCountry(code: string) {
    setCollapsedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const enabledRates = MASTER_VAT_RATES.filter((r) =>
        enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)),
      );

      const body = {
        rules: enabledRates.map((r) => ({
          countryCode: r.countryCode,
          rate: r.rate,
          taxCode: r.taxCode,
          recoverable: r.recoverable,
          description: r.description,
        })),
      };

      const res = await fetch("/api/settings/vat-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveStatus("saved");
        setIsDirty(false);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header + save */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Country VAT rates</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Enable the rates your business encounters. Enabled rates are recognised and
            calculated on invoices. Disabled rates default to £0 claimable (marked non-reclaimable).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {enabledCount} of {totalCount} rates enabled
          </span>
          {isDirty && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveStatus === "saved" ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saveStatus === "saved" ? "Saved" : "Save changes"}
            </Button>
          )}
          {saveStatus === "error" && (
            <span className="text-sm font-medium text-[var(--color-danger)]">Save failed — try again</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search country, code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm focus:outline-none"
        >
          <option value="all">All regions</option>
          {REGION_ORDER.map((r) => (
            <option key={r} value={r}>{REGION_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.entries(RATE_TYPE_LABELS) as [MasterVatRate["type"], string][]).map(([type, label]) => (
          <span key={type} className={`rounded-full border px-2.5 py-0.5 font-medium ${RATE_TYPE_COLORS[type]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Country list */}
      <div className="space-y-3">
        {filteredGrouped.size === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
            No countries match your search.
          </div>
        ) : (
          Array.from(filteredGrouped.entries()).map(([region, countries]) => {
            const isRegionCollapsed = collapsedRegions.has(region);
            const regionRates = Array.from(countries.values()).flat();
            const regionEnabled = regionRates.filter((r) =>
              enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)),
            ).length;

            return (
              <div key={region} className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                {/* Region header */}
                <button
                  type="button"
                  onClick={() => toggleRegion(region, !isRegionCollapsed)}
                  className="flex w-full items-center gap-3 bg-[var(--color-panel)] px-5 py-3 text-left transition hover:bg-[var(--color-border)]"
                >
                  {isRegionCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  )}
                  <span className="font-semibold text-sm">{REGION_LABELS[region as MasterVatRate["region"]]}</span>
                  <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                    {regionEnabled}/{regionRates.length} enabled
                  </span>
                </button>

                {!isRegionCollapsed && (
                  <div className="divide-y divide-[var(--color-border)]">
                    {Array.from(countries.entries()).map(([countryCode, rates]) => {
                      const countryName = rates[0]?.countryName ?? countryCode;
                      const allEnabled = rates.every((r) => enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)));
                      const someEnabled = rates.some((r) => enabledKeys.has(vatRateKey(r.countryCode, r.taxCode)));
                      const isCountryCollapsed = collapsedCountries.has(countryCode);
                      const enabledForCountry = rates.filter((r) => enabledKeys.has(vatRateKey(r.countryCode, r.taxCode))).length;

                      return (
                        <div key={countryCode}>
                          {/* Country row */}
                          <div className="flex items-center gap-3 px-5 py-3">
                            <button
                              type="button"
                              onClick={() => toggleCountry(countryCode)}
                              className="flex flex-1 items-center gap-3 text-left"
                            >
                              {isCountryCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                              )}
                              <span className="font-medium text-sm">{countryName}</span>
                              <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{countryCode}</span>
                              <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                                {enabledForCountry}/{rates.length} rate{rates.length !== 1 ? "s" : ""} enabled
                              </span>
                            </button>
                            {/* Country-level enable/disable all */}
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => toggleAllForCountry(rates, !allEnabled)}
                                className={`text-xs font-medium px-2.5 py-1 rounded-xl border transition ${
                                  allEnabled
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
                                    : someEnabled
                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
                                    : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
                                }`}
                              >
                                {allEnabled ? "Disable all" : "Enable all"}
                              </button>
                            </div>
                          </div>

                          {/* Rate rows */}
                          {!isCountryCollapsed && (
                            <div className="bg-[var(--color-panel)] divide-y divide-[var(--color-border)]">
                              {rates.map((rate) => {
                                const key = vatRateKey(rate.countryCode, rate.taxCode);
                                const isEnabled = enabledKeys.has(key);

                                return (
                                  <label
                                    key={key}
                                    className={`flex cursor-pointer items-center gap-4 px-6 py-3 transition ${
                                      isEnabled ? "bg-white" : "opacity-60 hover:opacity-80"
                                    } hover:bg-[var(--color-accent-soft)]`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={() => toggleRate(rate)}
                                      className="h-4 w-4 cursor-pointer rounded accent-[var(--color-accent)]"
                                    />
                                    <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
                                      <span className="font-mono text-sm font-semibold w-12 shrink-0">
                                        {rate.rate % 1 === 0
                                          ? `${rate.rate}%`
                                          : `${rate.rate.toFixed(1)}%`}
                                      </span>
                                      <span
                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${RATE_TYPE_COLORS[rate.type]}`}
                                      >
                                        {RATE_TYPE_LABELS[rate.type]}
                                      </span>
                                      <span className="font-mono text-xs text-[var(--color-muted-foreground)] bg-white border border-[var(--color-border)] px-2 py-0.5 rounded-lg">
                                        {rate.taxCode}
                                      </span>
                                      <span className="text-sm text-[var(--color-muted-foreground)] truncate">
                                        {rate.description}
                                      </span>
                                    </div>
                                    <span className={`shrink-0 text-xs font-medium ${isEnabled ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
                                      {isEnabled ? "Claimable" : "Not claimed"}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky save bar (shown when dirty) */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-accent)]">
            You have unsaved changes — {enabledCount} rates will be active after saving.
          </span>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEnabledKeys(buildEnabledKeys(initialRules));
                setIsDirty(false);
                setSaveStatus("idle");
              }}
            >
              Discard
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
