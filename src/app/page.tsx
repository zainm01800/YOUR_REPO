"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileDown,
  Receipt,
  SearchCheck,
  Upload,
  Wrench,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

const ACCENT = "#3A5599";
const ACCENT_SOFT = "rgba(58, 85, 153, 0.10)";

const previewRows = [
  {
    date: "18 Apr",
    merchant: "Morrisons",
    amount: "-£42.18",
    category: "Fuel",
    status: "Matched",
    tone: "success",
    issue: "Receipt linked",
  },
  {
    date: "19 Apr",
    merchant: "Amazon UK",
    amount: "-£86.40",
    category: "Computer / IT Costs",
    status: "Needs review",
    tone: "warning",
    issue: "VAT code missing",
  },
  {
    date: "21 Apr",
    merchant: "Unknown merchant",
    amount: "-£127.00",
    category: "Uncategorised",
    status: "Issue",
    tone: "danger",
    issue: "Missing receipt",
  },
  {
    date: "22 Apr",
    merchant: "Payment from D Hayward",
    amount: "+£130.00",
    category: "Lesson Income",
    status: "Matched",
    tone: "success",
    issue: "Ready to export",
  },
];

const workflow = [
  { title: "Upload", text: "Import a bank statement and add receipts or invoices.", icon: Upload },
  { title: "Match", text: "Zentra links receipts to bank lines where the totals and dates make sense.", icon: SearchCheck },
  { title: "Review", text: "Only the messy items are pushed into a clear review queue.", icon: AlertTriangle },
  { title: "Fix", text: "Choose categories, add missing evidence, and resolve VAT warnings.", icon: Wrench },
  { title: "Export", text: "Download cleaner records for yourself or your accountant.", icon: FileDown },
];

const realFeatures = [
  "Bank statement CSV/Excel imports",
  "Receipt and invoice extraction",
  "Suggested categories and review flags",
  "Missing receipt checks",
  "VAT summaries for VAT-registered workspaces",
  "Tax estimate guidance, clearly labelled as an estimate",
  "Period export packs for accountant review",
  "Role-based owner/accountant/business views",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      <LandingNav accentColor={ACCENT} />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <section className="grid gap-10 pb-14 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              Built around messy records, not perfect spreadsheets
            </div>

            <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.5rem)] font-extrabold leading-[1.03] tracking-tight text-[#111827]">
              Clean up your books before they become a tax problem.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600">
              Zentra helps sole traders and small businesses turn bank statements and receipts into
              reviewed, categorised, export-ready records. It finds the missing receipts, VAT checks,
              duplicates, and uncategorised lines that usually cause the mess.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-md transition hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Start with a statement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-5 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
              {["No Open Banking claim", "No HMRC submission claim", "Built for review first"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </section>

        <section className="pb-16 lg:pb-24">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                  Real workflow
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
                  Upload, match, review, fix, export.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-gray-500">
                Zentra is strongest as a review workspace. It does not pretend every imported line is correct;
                it highlights the lines that need a human decision.
              </p>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-5">
              {workflow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-2xl border border-gray-100 bg-[#F8F6F1] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400">0{index + 1}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#3A5599] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-extrabold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-gray-600">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="pb-16 lg:pb-24">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                What is actually included
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 lg:text-4xl">
                Honest bookkeeping automation, not fake filing software.
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                Zentra helps prepare cleaner digital records. It does not submit VAT returns to HMRC
                and does not provide live bank feeds yet. Those can come later; the current product
                focuses on getting your records clean.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {realFeatures.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold leading-6 text-gray-800">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="pb-20">
          <div className="overflow-hidden rounded-[28px] bg-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <div className="grid gap-8 p-7 text-white lg:grid-cols-[1fr_0.85fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Start simple</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight lg:text-4xl">
                  First job: upload a bank statement and see what needs fixing.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                  The fastest way to understand Zentra is to import real transactions. The app will
                  show which lines are ready, which need a receipt, and which need a category or VAT check.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 text-gray-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: ACCENT_SOFT, color: ACCENT }}>
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">Review-first bookkeeping</p>
                    <p className="text-xs text-gray-500">For sole traders and small businesses</p>
                  </div>
                </div>
                <Link
                  href="/sign-up"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  Start with uploading a statement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="mx-auto text-xs font-medium text-gray-400">zentra.app/review-queue</span>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Review queue
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-900">14 items need review</h2>
            <p className="mt-1 text-xs text-gray-500">
              Missing receipts, VAT checks, and uncategorised transactions.
            </p>
          </div>
          <span className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-bold text-white" style={{ background: ACCENT }}>
            Fix highest risk first
          </span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["Missing receipts", "6"],
            ["VAT checks", "4"],
            ["Duplicates", "2"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#F8F6F1] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <div className="grid grid-cols-[0.65fr_1.3fr_0.8fr_0.9fr] bg-gray-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
            <span>Date</span>
            <span>Transaction</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>
          {previewRows.map((row) => (
            <div key={`${row.date}-${row.merchant}`} className="grid grid-cols-[0.65fr_1.3fr_0.8fr_0.9fr] items-center border-t border-gray-100 px-3 py-3 text-xs">
              <span className="text-gray-500">{row.date}</span>
              <div className="min-w-0">
                <p className="truncate font-bold text-gray-900">{row.merchant}</p>
                <p className="truncate text-[10px] text-gray-500">{row.category} - {row.issue}</p>
              </div>
              <span
                className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ${
                  row.tone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : row.tone === "danger"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-800"
                }`}
              >
                {row.status}
              </span>
              <span className={`text-right font-mono font-bold ${row.amount.startsWith("+") ? "text-emerald-700" : "text-gray-900"}`}>
                {row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
