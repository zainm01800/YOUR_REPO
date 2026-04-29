"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Car,
  CircleHelp,
  FileText,
  FolderInput,
  Plus,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "./expense-form";
import { ExpensesList, type ExpenseEntry } from "./expenses-list";
import type { CategoryRule } from "@/lib/domain/types";

interface Props {
  expenses: ExpenseEntry[];
  categoryRules: CategoryRule[];
  vatCodes: string[];
  currency: string;
  totalExpenses: number;
  totalMileage: number;
  totalMiles: number;
  initialTab?: PageTab;
  canManageOperationalData?: boolean;
}

type PageTab = "expenses" | "mileage";
type SectionTab = "overview" | "claimable" | "not_claimable" | "needs_review";

export function ExpensesPageClient({
  expenses,
  categoryRules,
  vatCodes,
  currency,
  totalExpenses,
  totalMileage,
  totalMiles,
  initialTab = "expenses",
  canManageOperationalData = true,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [section, setSection] = useState<SectionTab>("overview");

  const activeTab: PageTab = initialTab;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  const cashExpenses = expenses.filter((e) => !e.isMileage);
  const mileageEntries = expenses.filter((e) => e.isMileage);
  const displayedExpenses = activeTab === "expenses" ? cashExpenses : mileageEntries;
  const categoryMap = new Map(categoryRules.map((r) => [r.category.toLowerCase(), r]));

  const getClaimStatus = (
    entry: ExpenseEntry,
  ): "claimable" | "not_claimable" | "needs_review" => {
    if (typeof entry.allowableOverride === "boolean") {
      return entry.allowableOverride ? "claimable" : "not_claimable";
    }
    if (entry.isMileage) return "claimable";
    if (!entry.category) return "needs_review";

    const rule = categoryMap.get(entry.category.toLowerCase());
    if (!rule) return "needs_review";

    return rule.allowableForTax && rule.allowablePercentage > 0
      ? "claimable"
      : "not_claimable";
  };

  const claimableExpenses = displayedExpenses.filter(
    (entry) => getClaimStatus(entry) === "claimable",
  );
  const nonClaimableExpenses = displayedExpenses.filter(
    (entry) => getClaimStatus(entry) === "not_claimable",
  );
  const needsReviewExpenses = displayedExpenses.filter(
    (entry) => getClaimStatus(entry) === "needs_review",
  );

  const claimableTotal = claimableExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const nonClaimableTotal = nonClaimableExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const importedExpenseCount = cashExpenses.filter(
    (entry) => entry.source === "transaction",
  ).length;
  const manualExpenseCount = cashExpenses.filter(
    (entry) => entry.source !== "transaction",
  ).length;
  const mileageClaimableTotal = mileageEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  const helperCards =
    activeTab === "expenses"
      ? [
          {
            icon: FolderInput,
            title: "Imported from transactions",
            detail: `${importedExpenseCount} categorised bank items are already feeding this page.`,
          },
          {
            icon: FileText,
            title: "Manual additions",
            detail: `${manualExpenseCount} manual item${
              manualExpenseCount === 1 ? "" : "s"
            } cover cash spend and missing statement lines.`,
          },
          {
            icon: CircleHelp,
            title: "Claimability",
            detail:
              "Claimable vs non-claimable follows your category library, with manual overrides where needed.",
          },
        ]
      : [
          {
            icon: Car,
            title: "Trips logged",
            detail: `${mileageEntries.length} mileage entr${
              mileageEntries.length === 1 ? "y is" : "ies are"
            } recorded in this workspace.`,
          },
          {
            icon: Receipt,
            title: "Estimated value",
            detail: `${fmt(mileageClaimableTotal)} currently flows into your deductible travel total.`,
          },
          {
            icon: CircleHelp,
            title: "Separate from cash expenses",
            detail:
              "Mileage claims stay outside supplier spend so tax summaries are easier to understand.",
          },
        ];

  const sectionTabs: Array<{
    id: SectionTab;
    label: string;
    count?: number;
    warn?: boolean;
  }> = [
    { id: "overview", label: "Overview" },
    { id: "claimable", label: "Claimable", count: claimableExpenses.length },
    { id: "not_claimable", label: "Not Claimable", count: nonClaimableExpenses.length },
    {
      id: "needs_review",
      label: "Needs Review",
      count: needsReviewExpenses.length,
      warn: needsReviewExpenses.length > 0,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-sm)]">
          <Link
            href="/expenses"
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "expenses"
                ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-2)] hover:bg-[#f4f2ed]"
            }`}
          >
            Expenses
          </Link>
          <Link
            href="/mileage"
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "mileage"
                ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-2)] hover:bg-[#f4f2ed]"
            }`}
          >
            Mileage
          </Link>

          <span className="mx-0.5 h-4 w-px bg-[var(--line)]" />

          {sectionTabs.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                    : "text-[var(--ink-2)] hover:bg-[#f4f2ed]"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      active
                        ? "bg-white/25 text-white"
                        : tab.warn
                          ? "bg-amber-100 text-amber-600"
                          : "bg-[var(--accent)]/10 text-[var(--accent)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {canManageOperationalData && !showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "expenses" ? "Add expense" : "Log mileage"}
          </Button>
        ) : null}
      </div>

      {canManageOperationalData && showForm ? (
        <ExpenseForm
          categoryRules={categoryRules}
          vatCodes={vatCodes}
          currency={currency}
          defaultIsMileage={activeTab === "mileage"}
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {section === "overview" ? (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
            <div className="rounded-[26px] border border-[var(--line)] bg-white px-6 py-6 shadow-[var(--shadow-sm)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                Working area
              </p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {activeTab === "expenses"
                  ? "Expense claims and imported costs"
                  : "Business mileage claims"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {activeTab === "expenses"
                  ? "Imported bank transactions feed this page automatically once they are categorised as P&L expenses. Manual entries are for cash costs or anything missing from the statement feed."
                  : "Mileage stays separate from supplier spend so you can track business travel claims clearly without mixing them into normal expense categories."}
              </p>
            </div>

            <div className="rounded-[26px] border border-[var(--line)] bg-[linear-gradient(135deg,#faf8f2_0%,#f3ecde_100%)] px-6 py-6 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                    How this page works
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                    {activeTab === "expenses"
                      ? "Imported and manual costs work together"
                      : "Mileage stays standalone by design"}
                  </h3>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-[var(--accent-ink)]" />
              </div>
              <div className="mt-5 space-y-3">
                {helperCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-[var(--accent-ink)]" />
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Receipt,
                label: "Cash expenses",
                value: fmt(totalExpenses),
                sub: `${cashExpenses.length} entries`,
              },
              {
                icon: Car,
                label: "Mileage deductions",
                value: fmt(totalMileage),
                sub: `${mileageEntries.length} trips`,
              },
              {
                icon: Car,
                label: "Total miles",
                value: `${totalMiles.toFixed(0)} mi`,
                sub: "business travel",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <stat.icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                    {stat.label}
                  </span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                  {stat.value}
                </span>
                <span className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="cm-kpi cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSection("claimable")}
            >
              <p className="cm-kpi-label">Claimable</p>
              <p className="cm-kpi-value text-[var(--good)]">{fmt(claimableTotal)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {claimableExpenses.length} item{claimableExpenses.length !== 1 ? "s" : ""}
                <span className="ml-1.5 text-[var(--accent)]">→ View</span>
              </p>
            </div>
            <div
              className="cm-kpi cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSection("not_claimable")}
            >
              <p className="cm-kpi-label">Not claimable</p>
              <p className="cm-kpi-value text-[var(--color-danger)]">
                {fmt(nonClaimableTotal)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {nonClaimableExpenses.length} item
                {nonClaimableExpenses.length !== 1 ? "s" : ""}
                <span className="ml-1.5 text-[var(--accent)]">→ View</span>
              </p>
            </div>
            <div
              className="cm-kpi cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSection("needs_review")}
            >
              <p className="cm-kpi-label">Needs review</p>
              <p
                className={`cm-kpi-value ${
                  needsReviewExpenses.length > 0 ? "text-amber-500" : "text-[var(--ink)]"
                }`}
              >
                {needsReviewExpenses.length}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Missing or unknown category
                {needsReviewExpenses.length > 0 ? (
                  <span className="ml-1.5 text-amber-500">→ Review</span>
                ) : null}
              </p>
            </div>
          </div>

          {activeTab === "expenses" ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Imported expenses",
                  value: importedExpenseCount.toString(),
                  note: "Flowing in automatically from categorised bank transactions.",
                },
                {
                  title: "Manual entries",
                  value: manualExpenseCount.toString(),
                  note: "Useful for petty cash, missing receipts, or non-bank costs.",
                },
                {
                  title: "Needs category review",
                  value: needsReviewExpenses.length.toString(),
                  note: "These should be checked before relying on the totals with confidence.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 shadow-[var(--shadow-sm)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">
                    {item.title}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!canManageOperationalData ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4 text-sm text-[var(--muted)] shadow-[var(--shadow-sm)]">
          This workspace access level is read-only for expenses and mileage. You can review the
          data here, but only the workspace owner, accountant admin, or bookkeeper can add or edit
          entries.
        </div>
      ) : null}

      {section === "claimable" ? (
        <ExpensesList
          title="Claimable"
          description={
            activeTab === "expenses"
              ? "These reduce taxable profit based on your category settings or manual overrides."
              : "Mileage claims usually stay claimable unless you deliberately override them."
          }
          expenses={claimableExpenses}
          currency={currency}
          claimStatus="claimable"
          canManageOperationalData={canManageOperationalData}
          onToggleClaimable={async (id, source, claimable) => {
            const { toggleExpenseClaimabilityAction } = await import("@/app/actions/bookkeeping");
            await toggleExpenseClaimabilityAction(id, source, claimable);
            router.refresh();
          }}
        />
      ) : null}

      {section === "not_claimable" ? (
        <ExpensesList
          title="Not claimable"
          description={
            activeTab === "expenses"
              ? "These are tracked, but currently excluded from tax claim calculations."
              : "Mileage items only appear here if you explicitly override the default treatment."
          }
          expenses={nonClaimableExpenses}
          currency={currency}
          claimStatus="not_claimable"
          canManageOperationalData={canManageOperationalData}
          onToggleClaimable={async (id, source, claimable) => {
            const { toggleExpenseClaimabilityAction } = await import("@/app/actions/bookkeeping");
            await toggleExpenseClaimabilityAction(id, source, claimable);
            router.refresh();
          }}
        />
      ) : null}

      {section === "needs_review" ? (
        needsReviewExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-8 py-12 text-center shadow-[var(--shadow-sm)]">
            <p className="text-sm font-semibold text-[var(--ink)]">All caught up</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Every expense has a valid category and nothing needs review.
            </p>
          </div>
        ) : (
          <ExpensesList
            title="Needs review"
            description="Add or correct the category before relying on the claimable total."
            expenses={needsReviewExpenses}
            currency={currency}
            claimStatus="needs_review"
            canManageOperationalData={canManageOperationalData}
            onToggleClaimable={async (id, source, claimable) => {
              const { toggleExpenseClaimabilityAction } = await import(
                "@/app/actions/bookkeeping"
              );
              await toggleExpenseClaimabilityAction(id, source, claimable);
              router.refresh();
            }}
          />
        )
      ) : null}
    </div>
  );
}
