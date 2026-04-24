import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getRepository } from "@/lib/data";
import { buildCategoryRuleMap, classifyTransaction } from "@/lib/accounting/classifier";
import { resolveCategory } from "@/lib/categories/suggester";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

// ── Reconciliation dashboard (for non-sole-trader workspaces) ──────────────
import { ReconciliationDashboard } from "@/components/dashboard/reconciliation-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

// ── UK Tax constants (2024/25) ─────────────────────────────────────────────
const UK_TAX = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  ni4Lower: 12_570,
  ni4Upper: 50_270,
  ni4LowerRate: 0.09,
  ni4UpperRate: 0.02,
  ni2Annual: 179.40,
  ni2SmallProfitsThreshold: 12_570,
};

function calcTax(profit: number) {
  const taxableIncome = Math.max(0, profit - UK_TAX.personalAllowance);
  const basicBand = Math.max(0, Math.min(taxableIncome, UK_TAX.basicRateLimit - UK_TAX.personalAllowance));
  const higherBand = Math.max(0, Math.min(taxableIncome - basicBand, UK_TAX.higherRateLimit - UK_TAX.basicRateLimit));
  const additionalBand = Math.max(0, taxableIncome - basicBand - higherBand);
  const incomeTax =
    basicBand * UK_TAX.basicRate +
    higherBand * UK_TAX.higherRate +
    additionalBand * UK_TAX.additionalRate;
  const ni4Profit = profit - UK_TAX.ni4Lower;
  const ni4Lower = Math.max(0, Math.min(ni4Profit, UK_TAX.ni4Upper - UK_TAX.ni4Lower)) * UK_TAX.ni4LowerRate;
  const ni4Upper = Math.max(0, ni4Profit - (UK_TAX.ni4Upper - UK_TAX.ni4Lower)) * UK_TAX.ni4UpperRate;
  const class4Ni = ni4Lower + ni4Upper;
  const class2Ni = profit > UK_TAX.ni2SmallProfitsThreshold ? UK_TAX.ni2Annual : 0;
  const totalTax = incomeTax + class4Ni + class2Ni;
  const effectiveRate = profit > 0 ? (totalTax / profit) * 100 : 0;
  return { incomeTax, class4Ni, class2Ni, totalTax, effectiveRate };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLong() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysFromNow(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function relativeDue(dueDate: string | null | undefined): string {
  if (!dueDate) return "—";
  const d = daysFromNow(dueDate);
  if (d > 0) return `in ${d} day${d !== 1 ? "s" : ""}`;
  if (d === 0) return "due today";
  return `${Math.abs(d)} day${Math.abs(d) !== 1 ? "s" : ""} overdue`;
}

function last6Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

// ── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2 || data.every((v) => v === 0)) return <div className="h-7 w-16" />;
  const W = 64, H = 28;
  const max = Math.max(...data, 0.01);
  const min = Math.min(...data);
  const range = max - min || max;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - 2 - ((v - min) / range) * (H - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
  overdue: { label: "Overdue", dot: "bg-red-500",     pill: "bg-red-50 text-red-600 border-red-200" },
  sent:    { label: "Sent",    dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-600 border-amber-200" },
  draft:   { label: "Draft",   dot: "bg-gray-400",    pill: "bg-gray-50 text-gray-500 border-gray-200" },
  paid:    { label: "Paid",    dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  void:    { label: "Void",    dot: "bg-gray-300",    pill: "bg-gray-50 text-gray-400 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Client avatar ──────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function Avatar({ name }: { name: string }) {
  const col = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${col}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  subColor = "text-[var(--color-muted-foreground)]",
  sparkData,
  sparkColor,
}: {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  sparkData: number[];
  sparkColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--color-foreground)]">
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={`text-xs font-semibold leading-snug ${subColor}`}>{sub}</span>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? "there";

  const repository = await getRepository();
  const settings = await repository.getSettingsSnapshot();
  const businessType = settings.workspace.businessType;

  // ── Non-sole-trader: hand off to reconciliation dashboard ─────────────
  if (businessType !== "sole_trader") {
    return <ReconciliationDashboard />;
  }

  // ── Sole-trader dashboard ──────────────────────────────────────────────
  let invoices: Awaited<ReturnType<typeof repository.getInvoices>> = [];
  let manualExpenses: Awaited<ReturnType<typeof repository.getManualExpenses>> = [];
  let budgets: Awaited<ReturnType<typeof repository.getCategoryBudgets>> = [];
  let runs: Awaited<ReturnType<typeof repository.getRunsWithTransactions>> = [];

  try {
    [invoices, manualExpenses, budgets, runs] = await Promise.all([
      repository.getInvoices(),
      repository.getManualExpenses(),
      repository.getCategoryBudgets(),
      repository.getRunsWithTransactions(),
    ]);
  } catch {
    // Tables may not exist yet — show dashboard with zeros
  }

  const currency = settings.workspace.defaultCurrency ?? "GBP";
  const now = new Date();
  const taxYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const taxYearStart = new Date(`${taxYear}-04-06`);
  const taxYearEnd = new Date(`${taxYear + 1}-04-05`);

  // ── Transaction income / expense from bank runs ────────────────────────
  const categoryRuleMap = buildCategoryRuleMap(settings.categoryRules);
  const monthlyIncomeMap: Record<string, number> = {};
  const monthlyExpenseMap: Record<string, number> = {};
  let txIncomeTotal = 0;
  let txExpenseTotal = 0;

  for (const run of runs) {
    for (const tx of run.transactions) {
      if (!tx.transactionDate) continue;
      const d = new Date(tx.transactionDate);
      if (d < taxYearStart || d > taxYearEnd) continue;
      const catName = tx.category ?? resolveCategory(tx, settings.categoryRules);
      const cat = catName ? categoryRuleMap.get(catName) : undefined;
      const cls = classifyTransaction(tx, cat, settings.workspace.vatRegistered);
      const mk = tx.transactionDate.slice(0, 7);
      if (cls.accountType === "income") {
        txIncomeTotal += Math.abs(cls.grossAmount);
        monthlyIncomeMap[mk] = (monthlyIncomeMap[mk] ?? 0) + Math.abs(cls.grossAmount);
      } else if (cls.accountType === "expense") {
        txExpenseTotal += Math.abs(cls.grossAmount);
        monthlyExpenseMap[mk] = (monthlyExpenseMap[mk] ?? 0) + Math.abs(cls.grossAmount);
      }
    }
  }

  // ── Invoice income (paid invoices in tax year) ─────────────────────────
  const paidInvYTD = invoices.filter((inv) => {
    if (inv.status !== "paid") return false;
    const d = new Date(inv.paidAt ?? inv.issueDate);
    return d >= taxYearStart && d <= taxYearEnd;
  });
  for (const inv of paidInvYTD) {
    const mk = (inv.paidAt ?? inv.issueDate).slice(0, 7);
    const amt = inv.paidAmount ?? inv.total;
    monthlyIncomeMap[mk] = (monthlyIncomeMap[mk] ?? 0) + amt;
  }
  const invoiceIncomeYTD = paidInvYTD.reduce((s, i) => s + (i.paidAmount ?? i.total), 0);

  // ── Manual expenses in tax year ────────────────────────────────────────
  const manualYTD = manualExpenses.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= taxYearStart && d <= taxYearEnd;
  });
  for (const exp of manualYTD) {
    const mk = exp.date.slice(0, 7);
    monthlyExpenseMap[mk] = (monthlyExpenseMap[mk] ?? 0) + exp.amount;
  }
  const manualExpenseTotal = manualYTD.reduce((s, e) => s + e.amount, 0);

  const totalIncome = invoiceIncomeYTD + txIncomeTotal;
  const totalExpenses = txExpenseTotal + manualExpenseTotal;
  const profit = Math.max(0, totalIncome - totalExpenses);
  const taxCalc = calcTax(profit);

  // ── Effective invoice statuses ─────────────────────────────────────────
  const enriched = invoices.map((inv) => {
    let effectiveStatus = inv.status;
    if (
      (inv.status === "sent" || inv.status === "draft") &&
      inv.dueDate &&
      daysFromNow(inv.dueDate) < 0
    ) {
      effectiveStatus = "overdue";
    }
    return { ...inv, effectiveStatus };
  });

  const overdueInvs = enriched.filter((i) => i.effectiveStatus === "overdue");
  const overdueTotal = overdueInvs.reduce((s, i) => s + i.total, 0);
  const overdueClients = new Set(overdueInvs.map((i) => i.clientId)).size;
  const over30Count = overdueInvs.filter(
    (i) => i.dueDate && daysFromNow(i.dueDate) < -30
  ).length;

  // Most overdue invoice for the alert banner
  const mostOverdue = [...overdueInvs].sort((a, b) => {
    const da = a.dueDate ? daysFromNow(a.dueDate) : 0;
    const db = b.dueDate ? daysFromNow(b.dueDate) : 0;
    return da - db; // most negative = most overdue
  })[0];

  // ── Sparkline arrays (last 6 months) ──────────────────────────────────
  const months6 = last6Months();
  const incomeSparkline = months6.map((m) => monthlyIncomeMap[m] ?? 0);
  const expenseSparkline = months6.map((m) => monthlyExpenseMap[m] ?? 0);
  const taxSparkline = months6.map((m) => {
    const inc = monthlyIncomeMap[m] ?? 0;
    const exp = monthlyExpenseMap[m] ?? 0;
    return calcTax(Math.max(0, inc - exp)).totalTax;
  });

  // ── Budget vs Actual (this calendar month) ─────────────────────────────
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spendByCat: Record<string, { monthly: number; count: number }> = {};

  for (const run of runs) {
    for (const tx of run.transactions) {
      if (!tx.transactionDate?.startsWith(thisMonth)) continue;
      const catName = tx.category ?? resolveCategory(tx, settings.categoryRules);
      const cat = catName ? categoryRuleMap.get(catName) : undefined;
      const cls = classifyTransaction(tx, cat, settings.workspace.vatRegistered);
      if (cls.accountType === "expense" && catName) {
        spendByCat[catName] ??= { monthly: 0, count: 0 };
        spendByCat[catName].monthly += Math.abs(cls.grossAmount);
        spendByCat[catName].count += 1;
      }
    }
  }
  for (const exp of manualExpenses) {
    if (!exp.date?.startsWith(thisMonth) || exp.isMileage) continue;
    const cat = exp.category ?? "Other";
    spendByCat[cat] ??= { monthly: 0, count: 0 };
    spendByCat[cat].monthly += exp.amount;
    spendByCat[cat].count += 1;
  }

  const budgetRows = budgets
    .map((b) => {
      const monthlyBudget = b.period === "monthly" ? b.amount : b.amount / 12;
      const spend = spendByCat[b.category] ?? { monthly: 0, count: 0 };
      return {
        category: b.category,
        budget: monthlyBudget,
        spent: spend.monthly,
        count: spend.count,
        over: spend.monthly > monthlyBudget,
      };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const totalSpent = Object.values(spendByCat).reduce((s, v) => s + v.monthly, 0);
  const totalBudget = budgets.reduce(
    (s, b) => s + (b.period === "monthly" ? b.amount : b.amount / 12),
    0
  );
  const onTrackCount = budgetRows.filter((r) => !r.over).length;

  // ── Recent invoices ────────────────────────────────────────────────────
  const recentInvoices = [...enriched]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 8);

  const openInvs = enriched.filter((i) =>
    ["sent", "overdue", "draft"].includes(i.effectiveStatus)
  );
  const openTotal = openInvs.reduce((s, i) => s + i.total, 0);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            Overview · {taxYear}/{String(taxYear + 1).slice(2)} Tax Year
          </p>
          <h1 className="mt-1.5 text-[1.75rem] font-extrabold tracking-tight text-[var(--color-foreground)]">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Here&apos;s where your business stands today, {todayLong()}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/bank-statements"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] shadow-sm transition hover:bg-[var(--color-panel)]"
          >
            <svg className="h-4 w-4 text-[var(--color-muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import statement
          </Link>
          <Link
            href="/invoices/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: "var(--color-accent)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New invoice
          </Link>
        </div>
      </div>

      {/* ── Alert banner (most overdue invoice) ─────────────────────────── */}
      {mostOverdue?.dueDate && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{mostOverdue.client.name}</span> is{" "}
              {Math.abs(daysFromNow(mostOverdue.dueDate))} days late on{" "}
              {mostOverdue.invoiceNumber}. We&apos;ve drafted a polite reminder — ready
              to send whenever you are.
            </p>
          </div>
          <Link
            href={`/invoices/${mostOverdue.id}`}
            className="shrink-0 text-sm font-semibold text-amber-700 hover:underline"
          >
            Review reminder →
          </Link>
        </div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Income (YTD)"
          value={formatCurrency(totalIncome, currency)}
          sub={totalIncome > 0 ? `${invoices.filter(i => i.status === "paid").length} paid invoice${invoices.filter(i => i.status === "paid").length !== 1 ? "s" : ""}` : "No income yet"}
          subColor="text-emerald-600"
          sparkData={incomeSparkline}
          sparkColor="#16a34a"
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(totalExpenses, currency)}
          sub={`${manualYTD.length} expense${manualYTD.length !== 1 ? "s" : ""} logged`}
          sparkData={expenseSparkline}
          sparkColor="#9ca3af"
        />
        <KpiCard
          label="Est. Tax Owed"
          value={formatCurrency(taxCalc.totalTax, currency)}
          sub={`On track · due Jan ${taxYear + 1}`}
          subColor="text-emerald-600"
          sparkData={taxSparkline}
          sparkColor="var(--color-accent)"
        />
        <KpiCard
          label="Overdue Invoices"
          value={overdueTotal > 0 ? formatCurrency(overdueTotal, currency) : "—"}
          sub={
            overdueClients > 0
              ? `${overdueClients} client${overdueClients !== 1 ? "s" : ""}${over30Count > 0 ? ` · ${over30Count} over 30 days` : ""}`
              : "All invoices on time"
          }
          subColor={overdueClients > 0 ? "text-red-600" : "text-emerald-600"}
          sparkData={months6.map((_, i) => (i === months6.length - 1 ? overdueTotal : 0))}
          sparkColor="#ef4444"
        />
      </div>

      {/* ── Two panels ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Live SA Estimate */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Live Self Assessment Estimate
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                Based on {formatCurrency(profit, currency)} taxable profit
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Recalculated every time you add income or expenses.
              </p>
            </div>
            <span
              className="shrink-0 rounded px-2 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              UK · {taxYear}/{String(taxYear + 1).slice(2)}
            </span>
          </div>

          <p className="mb-5 text-[2.2rem] font-extrabold tabular-nums leading-none text-[var(--color-foreground)]">
            {formatCurrency(taxCalc.totalTax, currency)}
            <span className="ml-2 text-sm font-medium text-[var(--color-muted-foreground)]">
              due by 31 Jan {taxYear + 1}
            </span>
          </p>

          <div className="space-y-3">
            {[
              { label: `Income Tax (${UK_TAX.basicRate * 100}%)`, amt: taxCalc.incomeTax },
              { label: `Class 4 NI (${UK_TAX.ni4LowerRate * 100}%)`, amt: taxCalc.class4Ni },
              { label: "Class 2 NI", amt: taxCalc.class2Ni },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-muted-foreground)]">{row.label}</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {formatCurrency(row.amt, currency)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${taxCalc.totalTax > 0 ? Math.min((row.amt / taxCalc.totalTax) * 100, 100) : 0}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-4">
            {[
              ["Taxable profit", formatCurrency(profit, currency)],
              ["Personal allowance", "£12,570"],
              ["Effective rate", `${taxCalc.effectiveRate.toFixed(1)}%`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {k}
                </p>
                <p className="mt-0.5 text-xs font-bold text-[var(--color-foreground)]">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                Budget vs. Actual
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {now.toLocaleString("en-GB", { month: "long" })} spending
              </p>
              {budgetRows.length > 0 && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {onTrackCount} of {budgetRows.length} categories on track this month.
                </p>
              )}
            </div>
            <Link
              href="/bookkeeping/budget"
              className="shrink-0 text-xs font-semibold hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              View all →
            </Link>
          </div>

          {budgetRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-accent-soft)" }}
              >
                <svg className="h-5 w-5" style={{ color: "var(--color-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">No budgets set yet</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Set monthly targets per category to track your spending.
              </p>
              <Link
                href="/bookkeeping/budget"
                className="mt-3 text-xs font-semibold hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                Set up budgets →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {budgetRows.map((row) => (
                  <div key={row.category}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--color-foreground)]">
                        {row.category}
                        {row.count > 0 && (
                          <span className="ml-1.5 text-[var(--color-muted-foreground)]">
                            {row.count} item{row.count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${row.over ? "text-red-600" : "text-[var(--color-muted-foreground)]"}`}
                      >
                        {formatCurrency(row.spent, currency)} / {formatCurrency(row.budget, currency)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((row.spent / (row.budget || 1)) * 100, 100)}%`,
                          background: row.over ? "#ef4444" : "var(--color-accent)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                <span className="text-[var(--color-muted-foreground)]">
                  Total spent · {formatCurrency(totalSpent, currency)}
                </span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatCurrency(totalBudget, currency)} budget ·{" "}
                  {formatCurrency(Math.max(0, totalBudget - totalSpent), currency)} remaining
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent Invoices ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
              Recent Invoices
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--color-foreground)]">
              {openInvs.length} open ·{" "}
              <span className="tabular-nums">{formatCurrency(openTotal, currency)}</span> outstanding
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
              {(["All", "Overdue", "Sent", "Paid"] as const).map((tab) => {
                const counts: Record<string, number> = {
                  All: enriched.length,
                  Overdue: overdueInvs.length,
                  Sent: enriched.filter((i) => i.effectiveStatus === "sent").length,
                  Paid: enriched.filter((i) => i.status === "paid").length,
                };
                return (
                  <Link
                    key={tab}
                    href={`/invoices${tab !== "All" ? `?status=${tab.toLowerCase()}` : ""}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/70"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {tab}
                    {counts[tab] > 0 && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                      >
                        {counts[tab]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/invoices/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "var(--color-accent)" }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Invoice
            </Link>
          </div>
        </div>

        {/* Table */}
        {recentInvoices.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No invoices yet.</p>
            <Link
              href="/invoices/new"
              className="mt-2 inline-block text-sm font-semibold hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              Create your first invoice →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                    <th className="px-5 py-3">Invoice</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="hidden px-5 py-3 md:table-cell">Due Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Status</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="group transition-colors hover:bg-[var(--color-panel)]"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-sm font-semibold text-[var(--color-foreground)] transition hover:text-[var(--color-accent)]"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={inv.client.name} />
                          <span className="text-sm text-[var(--color-foreground)]">
                            {inv.client.name}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3.5 md:table-cell">
                        {inv.dueDate ? (
                          <div>
                            <p
                              className={`text-sm ${inv.effectiveStatus === "overdue" ? "font-semibold text-red-600" : "text-[var(--color-foreground)]"}`}
                            >
                              {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p
                              className={`text-xs ${inv.effectiveStatus === "overdue" ? "text-red-400" : "text-[var(--color-muted-foreground)]"}`}
                            >
                              {relativeDue(inv.dueDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                          {formatCurrency(inv.total, inv.currency)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <StatusBadge status={inv.effectiveStatus} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-foreground)]"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Showing {recentInvoices.length} of {invoices.length} invoice
                {invoices.length !== 1 ? "s" : ""}
              </p>
              <Link
                href="/invoices"
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                Open all invoices →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
