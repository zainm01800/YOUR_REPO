"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Mail,
  ReceiptText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

const ACCENT = "#28477F";
const CONTACT_EMAIL = "zentra.finance@outlook.com";

const services = [
  {
    title: "Sole trader bookkeeping",
    description:
      "Bank statement review, income and expense categorisation, receipt checks, and clean records for the tax year.",
    icon: FileSpreadsheet,
  },
  {
    title: "Self Assessment preparation support",
    description:
      "Organised figures for profit, allowable expenses, tax to set aside, and the records needed before submitting.",
    icon: Calculator,
  },
  {
    title: "Receipt and bank matching",
    description:
      "I help match receipts and invoices to bank transactions, flag missing evidence, and tidy unclear spending.",
    icon: ReceiptText,
  },
  {
    title: "VAT records support",
    description:
      "For VAT-registered businesses, I can help prepare VAT summaries from categorised transactions and receipts.",
    icon: Banknote,
  },
  {
    title: "Small business record clean-up",
    description:
      "If your bookkeeping is messy or behind, I can help turn statements, receipts, and notes into usable records.",
    icon: UploadCloud,
  },
  {
    title: "Accountant-ready export pack",
    description:
      "Clean transaction exports, missing receipt lists, review notes, and summaries you can share with an accountant.",
    icon: ShieldCheck,
  },
];

const process = [
  "Tell me what help you need",
  "Send statements, receipts, or current records",
  "I review, categorise, and flag missing information",
  "You get clean summaries and next steps",
];

export default function Home() {
  const [service, setService] = useState("Sole trader bookkeeping");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");

  const mailtoHref = useMemo(() => {
    const subject = `Zentra enquiry - ${service || "Accounting help"}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Service needed: ${service}`,
      "",
      "More information:",
      details,
    ].join("\n");
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [details, email, name, service]);

  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      <LandingNav accentColor={ACCENT} mode="services" />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <section className="grid gap-10 pb-16 pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-24 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D7D1C7] bg-white px-4 py-1.5 text-xs font-bold text-[#344054] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              Bookkeeping help for sole traders and small businesses
            </div>

            <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.45rem)] font-extrabold leading-[1.03] tracking-tight text-[#111827]">
              Get your accounts organised without the spreadsheet stress.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-[#344054]">
              I help sole traders and small businesses clean up bank statements, receipts,
              expenses, VAT records, and tax-year summaries so the numbers are easier to understand
              and ready for review.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="#contact"
                className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold !text-white shadow-md transition hover:brightness-110"
                style={{ background: ACCENT }}
              >
                Tell me what you need
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex h-12 items-center rounded-xl border border-[#D7D1C7] bg-white px-6 text-sm font-bold text-[#1F2937] transition hover:bg-[#F8F6F1]"
              >
                Email me directly
              </a>
            </div>

            <div className="mt-5 grid gap-2 text-sm font-medium text-[#344054] sm:grid-cols-3">
              {["Sole traders", "Small businesses", "Records clean-up"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ContactCard
            service={service}
            setService={setService}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            details={details}
            setDetails={setDetails}
            mailtoHref={mailtoHref}
          />
        </section>

        <section id="services" className="pb-16 lg:pb-24">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                Services
              </p>
              <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-gray-900 lg:text-4xl">
                Practical accounts support focused on clean records.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#4B5563]">
              The private Zentra workspace is the tool I use behind the scenes to organise,
              review, and export records. Customers do not need an account to enquire.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#28477F]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="process" className="pb-16 lg:pb-24">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:p-7">
            <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                  How it works
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
                  Simple, private, and built around your records.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  In the beginning, this is not a public self-service app. You contact me, I review
                  what you need, and I use my private workspace to organise the accounting work.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {process.map((step, index) => (
                  <div key={step} className="rounded-2xl bg-[#F8F6F1] p-4">
                    <span className="text-xs font-bold text-[#667085]">0{index + 1}</span>
                    <p className="mt-3 text-sm font-bold text-gray-900">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="pb-20">
          <div className="overflow-hidden rounded-[28px] bg-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <div className="grid gap-8 p-7 text-white lg:grid-cols-[1fr_0.9fr] lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CBD5E1]">
                  Contact
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight lg:text-4xl">
                  Tell me what service you need.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D1D5DB]">
                  Use the form to draft an email with your details, or email me directly. Include
                  the type of work you need, how far behind the records are, and whether you have
                  bank statements, receipts, invoices, or VAT records ready.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                >
                  <Mail className="h-4 w-4" />
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div className="rounded-2xl bg-white p-5 text-gray-900">
                <p className="text-sm font-extrabold">Quick enquiry checklist</p>
                <div className="mt-4 space-y-3">
                  {[
                    "What service do you need?",
                    "Are you a sole trader or small business?",
                    "Do you have bank statements and receipts ready?",
                    "Do you need VAT help?",
                    "What deadline are you working towards?",
                  ].map((item) => (
                    <div key={item} className="flex gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
                <a
                  href="#contact-form"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold !text-white"
                  style={{ background: ACCENT }}
                >
                  Fill in enquiry form
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function ContactCard({
  service,
  setService,
  name,
  setName,
  email,
  setEmail,
  details,
  setDetails,
  mailtoHref,
}: {
  service: string;
  setService: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  details: string;
  setDetails: (value: string) => void;
  mailtoHref: string;
}) {
  return (
    <div id="contact-form" className="rounded-[28px] border border-[#D7D1C7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#667085]">
        Enquiry form
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
        What do you need help with?
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">
        This opens an email to me with your answers filled in. No customer login is needed.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#475467]">Service</span>
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-[#D7D1C7] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#28477F] focus:ring-2 focus:ring-[#28477F]/15"
          >
            {services.map((item) => (
              <option key={item.title} value={item.title}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#475467]">Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-[#D7D1C7] bg-white px-3 text-sm text-[#111827] outline-none placeholder:text-[#667085] focus:border-[#28477F] focus:ring-2 focus:ring-[#28477F]/15"
            placeholder="Your name"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#475467]">Your email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-[#D7D1C7] bg-white px-3 text-sm text-[#111827] outline-none placeholder:text-[#667085] focus:border-[#28477F] focus:ring-2 focus:ring-[#28477F]/15"
            placeholder="you@example.com"
            type="email"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#475467]">More information</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={5}
            className="mt-1 w-full resize-none rounded-xl border border-[#D7D1C7] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#667085] focus:border-[#28477F] focus:ring-2 focus:ring-[#28477F]/15"
            placeholder="Tell me what records you have, what needs doing, and any deadlines."
          />
        </label>
      </div>

      <a
        href={mailtoHref}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold !text-white shadow-md transition hover:brightness-110"
        style={{ background: ACCENT }}
      >
        Send enquiry by email
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
