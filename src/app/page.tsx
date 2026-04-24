import Link from "next/link";
import {
  Calculator,
  Car,
  Check,
  FileText,
  PieChart,
  Receipt,
  ScanText,
  Target,
  TrendingUp,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ScanText,
    title: "Bank import & OCR",
    description:
      "Upload bank statements or scan receipts with AI extraction. ClearMatch reads the numbers so you don't have to type them.",
  },
  {
    icon: FileText,
    title: "Invoices & clients",
    description:
      "Create professional invoices in seconds, track what's outstanding, and mark payments with one click.",
  },
  {
    icon: Car,
    title: "Expenses & mileage",
    description:
      "Log cash expenses and claim HMRC mileage at £0.45/mile. Every deductible penny counted automatically.",
  },
  {
    icon: Target,
    title: "Budget vs. actual",
    description:
      "Set spending targets by category and see exactly where you're on track or overspending — month and year.",
  },
  {
    icon: PieChart,
    title: "Tax estimate",
    description:
      "Live UK Self Assessment estimate with income tax, Class 4 NI, and payment on account dates. No spreadsheet required.",
  },
  {
    icon: Receipt,
    title: "VAT reconciliation",
    description:
      "MTD-ready VAT summary that reconciles what you've charged against what you owe. Built for Making Tax Digital.",
  },
];

const trustBadges = [
  "No card required",
  "Open Banking supported",
  "MTD-ready for VAT",
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#F5F4F1" }}>
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="pt-16 pb-8 lg:pt-24 lg:pb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Built for UK sole traders · Self Assessment ready
          </div>

          {/* Headline */}
          <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-[#0f1623]">
            Bookkeeping built for{" "}
            <span className="text-[var(--color-accent)]">the self-employed.</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-muted-foreground)]">
            Cash in, cash out, tax sorted. ClearMatch is the tidy, no-jargon way to
            keep your numbers in order — without paying an accountant.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up">
              <Button className="h-12 rounded-2xl px-7 text-base font-semibold shadow-lg transition-all hover:scale-[1.02]">
                Start free — 30 days
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="secondary"
                className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-7 text-base font-semibold transition-all hover:bg-white/80"
              >
                See a demo account
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap gap-4">
            {trustBadges.map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* ── Dashboard Mockup ─────────────────────────────────────────────── */}
        <section className="pb-20 lg:pb-28">
          {/* Browser chrome */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_24px_80px_rgba(15,23,31,0.12)]">
            {/* Title bar */}
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[#f8f7f4] px-5 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="mx-auto text-xs text-[var(--color-muted-foreground)]">
                app.clearmatch.co.uk/dashboard
              </span>
            </div>

            {/* App shell */}
            <div className="flex" style={{ minHeight: 520 }}>
              {/* Sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-[var(--color-border)] bg-[#f8f7f4] p-4 lg:block">
                <div className="mb-5 flex items-center gap-2 px-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-accent)]">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-foreground)]">ClearMatch</span>
                </div>
                {["Dashboard", "Transactions", "Invoices", "Expenses", "Mileage", "Tax estimate", "VAT"].map((item, i) => (
                  <div
                    key={item}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${i === 0 ? "bg-white text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted-foreground)]"}`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-hidden p-5">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                      Overview · 2026/27 Tax Year
                    </p>
                    <h2 className="text-xl font-bold text-[var(--color-foreground)]">Good morning, Ellie</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium sm:block">
                      Apr — Jul
                    </span>
                    <div className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white">
                      Import statement
                    </div>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Income (YTD)", value: "£28,412", sub: "+12.4%", subColor: "text-emerald-600" },
                    { label: "Expenses", value: "£6,104", sub: "+3.1%", subColor: "text-[var(--color-muted-foreground)]" },
                    { label: "Est. tax owed", value: "£4,287", sub: "On track", subColor: "text-emerald-600" },
                    { label: "Overdue invoices", value: "£1,820", sub: "2 clients", subColor: "text-[var(--color-danger)]" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">{card.label}</p>
                      <p className="mt-0.5 text-lg font-bold text-[var(--color-foreground)]">{card.value}</p>
                      <p className={`text-[10px] font-medium ${card.subColor}`}>{card.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Bottom panels */}
                <div className="grid gap-3 lg:grid-cols-2">
                  {/* Tax estimate */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                          Live Self Assessment Estimate
                        </p>
                        <p className="text-sm font-bold text-[var(--color-foreground)]">£4,287.50 due by Jan 2027</p>
                      </div>
                      <span className="rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                        UK · 2026/27
                      </span>
                    </div>
                    {[
                      { label: "Income Tax (20%)", amount: "£2,842", pct: 66, color: "bg-[var(--color-accent)]" },
                      { label: "Class 4 NI (6%)", amount: "£1,178", pct: 27, color: "bg-[var(--color-accent)]" },
                      { label: "Class 2 NI", amount: "£267", pct: 6, color: "bg-gray-300" },
                    ].map((row) => (
                      <div key={row.label} className="mb-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-muted-foreground)]">{row.label}</span>
                          <span className="font-semibold text-[var(--color-foreground)]">{row.amount}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-border)]">
                          <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 flex gap-4 border-t border-[var(--color-border)] pt-2 text-[9px]">
                      {[["Taxable profit", "£22,308"], ["Personal allowance", "£12,570"], ["Effective rate", "19.2%"]].map(([k, v]) => (
                        <div key={k}>
                          <p className="uppercase tracking-wide text-[var(--color-muted-foreground)]">{k}</p>
                          <p className="font-bold text-[var(--color-foreground)]">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget vs actual */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                        Budget vs. Actual
                      </p>
                      <span className="text-[10px] font-medium text-[var(--color-accent)]">April</span>
                    </div>
                    {[
                      { label: "Software & subscriptions", spent: 184, budget: 200, over: false },
                      { label: "Travel & mileage", spent: 312, budget: 250, over: true },
                      { label: "Equipment", spent: 48, budget: 150, over: false },
                      { label: "Marketing", spent: 72, budget: 120, over: false },
                    ].map((row) => (
                      <div key={row.label} className="mb-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-foreground)]">{row.label}</span>
                          <span className={`font-semibold ${row.over ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`}>
                            £{row.spent} / £{row.budget}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-border)]">
                          <div
                            className={`h-full rounded-full ${row.over ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]"}`}
                            style={{ width: `${Math.min((row.spent / row.budget) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="pb-20 lg:pb-28">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Everything you need
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0f1623]">
              Your whole business, in one place.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
              From your first invoice to your Self Assessment return — ClearMatch handles the
              bookkeeping so you can focus on the work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA strip ────────────────────────────────────────────────────── */}
        <section className="mb-20 overflow-hidden rounded-3xl bg-[var(--color-accent)] px-8 py-14 text-center shadow-xl lg:mb-28">
          <h2 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Start sorting your books today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">
            Free for 30 days. No credit card. No accountant needed.
            Cancel any time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/sign-up">
              <Button className="h-12 rounded-2xl bg-white px-8 text-base font-bold text-[var(--color-accent)] transition-all hover:scale-[1.02] hover:bg-white/90">
                Start free — 30 days
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="h-12 rounded-2xl border border-white/30 px-8 text-base font-semibold text-white transition-all hover:bg-white/10 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
