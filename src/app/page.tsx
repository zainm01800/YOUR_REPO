"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

// Indigo accent to match Claude Design (overrides the app's green)
const ACCENT = "#3A5599";
const ACCENT_SOFT = "rgba(58, 85, 153, 0.10)";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#F0EDE8" }}>
      <LandingNav accentColor={ACCENT} />

      <main className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-10">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="pt-16 pb-10 lg:pt-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            Built for UK sole traders · Self Assessment ready
          </div>

          {/* Headline */}
          <h1 className="mt-6 max-w-xl text-[clamp(2.8rem,6vw,4.2rem)] font-extrabold leading-[1.05] tracking-tight text-[#111827]">
            Your books,{" "}
            <span style={{ color: ACCENT }}>sorted.</span>
          </h1>

          {/* Sub */}
          <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-gray-500">
            Bookkeeping built for UK sole traders and freelancers. Import your
            bank, chase your invoices, and see your tax bill before HMRC does.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Start free — 30 days
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              See a demo account
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap gap-5">
            {["No card required", "Open Banking supported", "MTD-ready for VAT"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Dashboard Mockup ───────────────────────────────────────────── */}
        <section className="pb-20 lg:pb-24">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
            {/* Browser bar */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="mx-auto text-xs text-gray-400">app.clearmatch.co.uk/dashboard</span>
            </div>

            <div className="flex" style={{ minHeight: 500 }}>
              {/* Sidebar */}
              <div className="hidden w-40 shrink-0 border-r border-gray-100 bg-gray-50 p-3 lg:block">
                <div className="mb-4 flex items-center gap-2 px-1 py-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800">ClearMatch</span>
                </div>
                {[
                  { label: "Dashboard", active: true },
                  { label: "Transactions", active: false },
                  { label: "Invoices", active: false },
                  { label: "Expenses", active: false },
                  { label: "Mileage", active: false },
                  { label: "Tax estimate", active: false },
                  { label: "VAT", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="mb-0.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    style={item.active
                      ? { background: "white", color: "#111827", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                      : { color: "#9ca3af" }}
                  >
                    {item.active && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ACCENT }} />}
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="flex-1 p-5">
                {/* Header row */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400">Overview · 2026/27 Tax Year</p>
                    <h2 className="mt-0.5 text-lg font-bold text-gray-900">Good morning, Ellie</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">Apr — Jul</span>
                    <span className="rounded-lg px-3 py-1 text-xs font-semibold text-white" style={{ background: ACCENT }}>Import statement</span>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {[
                    { label: "Income (YTD)", value: "£28,412", sub: "+12.4%", subClass: "text-emerald-600" },
                    { label: "Expenses",     value: "£6,104",  sub: "+3.1%",  subClass: "text-gray-400" },
                    { label: "Est. tax owed",value: "£4,287",  sub: "On track",subClass: "text-emerald-600" },
                    { label: "Overdue invoices",value:"£1,820",sub: "2 clients",subClass: "text-red-500" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <p className="text-[9px] font-medium text-gray-400">{c.label}</p>
                      <p className="mt-0.5 text-lg font-bold text-gray-900">{c.value}</p>
                      <p className={`text-[10px] font-semibold ${c.subClass}`}>{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Two panels */}
                <div className="grid gap-3 lg:grid-cols-2">
                  {/* SA Estimate */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Live Self Assessment Estimate</p>
                        <p className="text-sm font-bold text-gray-900">£4,287.50 due by Jan 2027</p>
                      </div>
                      <span className="rounded px-2 py-0.5 text-[8px] font-bold" style={{ background: ACCENT_SOFT, color: ACCENT }}>UK · 2026/27</span>
                    </div>
                    {[
                      { label: "Income Tax (20%)", amt: "£2,842", w: 66, color: ACCENT },
                      { label: "Class 4 NI (6%)",  amt: "£1,178", w: 28, color: "#8B9DC0" },
                      { label: "Class 2 NI",       amt: "£267",   w: 6,  color: "#C5CCDA" },
                    ].map((r) => (
                      <div key={r.label} className="mb-2">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-500">{r.label}</span>
                          <span className="font-semibold text-gray-800">{r.amt}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${r.w}%`, background: r.color }} />
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 flex gap-5 border-t border-gray-100 pt-2">
                      {[["Taxable profit","£22,308"],["Personal allowance","£12,570"],["Effective rate","19.2%"]].map(([k,v]) => (
                        <div key={k}>
                          <p className="text-[8px] uppercase tracking-wide text-gray-400">{k}</p>
                          <p className="text-[10px] font-bold text-gray-800">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget vs Actual */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Budget vs. Actual</p>
                      <p className="text-[10px] font-semibold" style={{ color: ACCENT }}>April — <a href="#" className="underline underline-offset-2">View all →</a></p>
                    </div>
                    {[
                      { label: "Software & subscriptions", spent: 184, budget: 200, over: false },
                      { label: "Travel & mileage",          spent: 312, budget: 250, over: true  },
                      { label: "Equipment",                 spent: 48,  budget: 150, over: false },
                      { label: "Marketing",                 spent: 72,  budget: 120, over: false },
                    ].map((r) => (
                      <div key={r.label} className="mb-2.5">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-600">{r.label}</span>
                          <span className={`font-semibold ${r.over ? "text-red-500" : "text-gray-500"}`}>£{r.spent} / £{r.budget}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((r.spent/r.budget)*100,100)}%`, background: r.over ? "#ef4444" : ACCENT }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section id="features" className="pb-20 lg:pb-24">
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Everything in one place</p>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight text-gray-900 lg:text-4xl">
            The bookkeeping toolkit for people without an accountant.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
            Six jobs, one quiet interface. No double-entry jargon, no training video — just
            the things you actually need to keep HMRC happy and cash moving.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Bank import & OCR */}
            <FeatureCard
              icon={<DocIcon />}
              title="Bank import & OCR"
              description="Upload a CSV or PDF statement and we'll categorise every line. Snap receipts — we'll read merchant, VAT and total."
              preview={
                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  {[["Merchant","Pret A Manger"],["Date","18 Apr"],["Total","£8.40"],["VAT","£1.40"]].map(([k,v]) => (
                    <div key={k} className="flex justify-between border-b border-gray-50 py-1 text-[10px]">
                      <span className="text-gray-400">{k}</span>
                      <span className="font-medium text-gray-700">{v}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex justify-between text-[10px]">
                    <span className="text-gray-400">Category</span>
                    <span className="font-semibold" style={{ color: ACCENT }}>Meals - client</span>
                  </div>
                </div>
              }
              accent={ACCENT}
            />

            {/* Invoices & clients */}
            <FeatureCard
              icon={<InvoiceIcon />}
              title="Invoices & clients"
              description="Create proper invoices in seconds, track what's sent, and get nudges when a client is running late."
              preview={
                <div className="space-y-1.5">
                  {[
                    { num: "INV-0841", client: "Halden & Co.",    amt: "£1,820", status: "Overdue", color: "bg-red-50 text-red-600" },
                    { num: "INV-0840", client: "Northfield",      amt: "£980",   status: "Sent",    color: "bg-blue-50 text-blue-600" },
                    { num: "INV-0838", client: "Halden & Co.",    amt: "£2,400", status: "Paid",    color: "bg-emerald-50 text-emerald-600" },
                  ].map((r) => (
                    <div key={r.num} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-1.5">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-800">{r.num}</p>
                        <p className="text-[9px] text-gray-400">{r.client}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-700">{r.amt}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${r.color}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
              accent={ACCENT}
            />

            {/* Expenses & mileage */}
            <FeatureCard
              icon={<CarIcon />}
              title="Expenses & mileage"
              description="Log cash receipts and HMRC-approved mileage at 45p per mile — no spreadsheet gymnastics."
              preview={
                <div className="space-y-2">
                  {[
                    { label: "London → Bristol", sub: "118 mi × £0.45", amt: "£53.10" },
                    { label: "Co-working day pass", sub: "Cash · 15 Apr", amt: "£24.00" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-800">{r.label}</p>
                        <p className="text-[9px] text-gray-400">{r.sub}</p>
                      </div>
                      <span className="text-[11px] font-bold text-gray-800">{r.amt}</span>
                    </div>
                  ))}
                </div>
              }
              accent={ACCENT}
            />

            {/* Budget vs actual */}
            <FeatureCard
              icon={<TargetIcon />}
              title="Budget vs. actual"
              description="Set a monthly budget per category and see exactly where you're on track — and where you're not."
              preview={
                <div className="space-y-2">
                  {[
                    { label: "Software",  spent: 184, budget: 200, over: false },
                    { label: "Travel",    spent: 312, budget: 250, over: true  },
                    { label: "Marketing", spent: 72,  budget: 120, over: false },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-600">{r.label}</span>
                        <span className={`font-semibold ${r.over ? "text-red-500" : "text-gray-500"}`}>£{r.spent} / £{r.budget}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.min((r.spent/r.budget)*100,100)}%`, background: r.over ? "#ef4444" : ACCENT }} />
                      </div>
                    </div>
                  ))}
                </div>
              }
              accent={ACCENT}
            />

            {/* Live tax estimate */}
            <FeatureCard
              icon={<PieIcon />}
              title="Live tax estimate"
              description="A rolling UK Self Assessment figure with Income Tax and National Insurance broken out — no January panic."
              preview={
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xl font-extrabold text-gray-900">£4,287.50</p>
                  <p className="text-[9px] text-gray-400">Estimated Self Assessment · due Jan 2027</p>
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                    <div className="h-full" style={{ width: "66%", background: ACCENT }} />
                    <div className="h-full" style={{ width: "27%", background: "#8B9DC0" }} />
                    <div className="h-full flex-1" style={{ background: "#C5CCDA" }} />
                  </div>
                  <div className="mt-1.5 flex gap-3 text-[8px] text-gray-400">
                    <span>● Income Tax</span><span>● Class 4 NI</span><span>● Class 2 NI</span>
                  </div>
                </div>
              }
              accent={ACCENT}
            />

            {/* VAT reconciliation */}
            <FeatureCard
              icon={<ReceiptIcon />}
              title="VAT reconciliation"
              description="MTD-ready VAT summary built straight from your transactions. Review, reconcile, submit."
              preview={
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-500">Q4 · JAN-MAR 2026</span>
                    <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ background: ACCENT_SOFT, color: ACCENT }}>MTD ready</span>
                  </div>
                  {[
                    { label: "Box 1 - VAT on sales",    amt: "£3,842.00" },
                    { label: "Box 4 - VAT reclaimed",   amt: "£612.40"   },
                    { label: "Box 5 - Net VAT due",     amt: "£3,228.60", bold: true },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between border-t border-gray-50 py-1 text-[9px]">
                      <span className="text-gray-500">{r.label}</span>
                      <span className={r.bold ? "font-bold text-gray-900" : "font-medium text-gray-700"}>{r.amt}</span>
                    </div>
                  ))}
                </div>
              }
              accent={ACCENT}
            />

          </div>
        </section>
      </main>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#111827] px-5 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div className="text-white">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight lg:text-4xl">
              One plan. Everything included. No accountant required.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-400">
              We priced ClearMatch so it pays for itself the first time you
              don't hire someone to file a VAT return. Cancel any time —
              your data exports cleanly to CSV or your accountant's software.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-gray-400">
              {["30 days free","Cancel anytime","UK support, human replies"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="text-gray-600">•</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — pricing card */}
          <div className="rounded-2xl bg-[#1E2A3B] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Sole Trader</p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-5xl font-extrabold text-white">£9</span>
              <span className="mb-1.5 text-gray-400">/ month</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Billed monthly · £90/yr if you pay annually</p>

            <ul className="mt-6 space-y-2.5">
              {[
                "Bank import & receipt OCR",
                "Unlimited invoices & clients",
                "Mileage & expenses",
                "Live tax estimate",
                "VAT reconciliation (MTD)",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: ACCENT }}>
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex gap-3">
              <Link
                href="/sign-up"
                className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-bold text-gray-900 transition hover:bg-gray-100"
              >
                Start free trial
              </Link>
              <Link
                href="/sign-in"
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-center text-sm font-semibold text-gray-300 transition hover:border-gray-400"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function FeatureCard({ icon, title, description, preview, accent }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  preview: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `rgba(58,85,153,0.10)`, color: accent }}>
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{description}</p>
      <div className="mt-4 flex-1">{preview}</div>
    </div>
  );
}

/* Inline SVG icons */
function DocIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
}
function InvoiceIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
}
function CarIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path d="M13 6H5l-2 6h14l-2-6zM1 11h2m18 0h2"/></svg>;
}
function TargetIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function PieIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>;
}
function ReceiptIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12l3-3 2 2 2-2 2 2 2-2 3 3V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h4"/></svg>;
}
