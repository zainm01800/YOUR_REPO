"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Mail,
  PiggyBank,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

const ACCENT = "#28477F";
const CONTACT_EMAIL = "zentra.finance@outlook.com";

const services = [
  {
    title: "Bookkeeping",
    description: "Stay organised, track income and expenses, and keep clean records.",
    icon: BookOpenCheck,
  },
  {
    title: "Tax Returns",
    description: "Prepare clear figures and file confidently before deadlines.",
    icon: Calculator,
  },
  {
    title: "Tax Saving Advice",
    description: "Understand allowable expenses and avoid paying more than you need to.",
    icon: PiggyBank,
  },
];

const pricing = [
  {
    name: "Starter",
    price: "£30",
    cadence: "per month",
    description: "Basic bookkeeping support for tidy monthly records.",
    features: ["Income and expense tracking", "Category review", "Monthly summary"],
    highlight: false,
  },
  {
    name: "Standard",
    price: "£60",
    cadence: "per month",
    description: "More regular support for busy sole traders and small businesses.",
    features: ["Bookkeeping review", "Receipt checks", "Tax saving pointers"],
    highlight: true,
  },
  {
    name: "Self Assessment",
    price: "£120",
    cadence: "one-time",
    description: "One-off tax return support from organised records.",
    features: ["Profit summary", "Expense review", "Tax return figures"],
    highlight: false,
  },
];

const reasons = [
  "Simple and stress-free",
  "Fast response times",
  "Focused on small businesses",
];

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");
    setSubmitMessage("");

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "Website enquiry",
          name,
          email,
          details: message,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not send your enquiry.");

      setSubmitState("sent");
      setSubmitMessage("Thanks. Your enquiry has been sent. I will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setSubmitState("error");
      setSubmitMessage(
        err instanceof Error
          ? err.message
          : "I could not send the enquiry right now. Please try again.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#DCD3C5] text-[#101828]">
      <LandingNav accentColor={ACCENT} mode="services" />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <section className="pb-16 pt-16 text-center lg:pb-20 lg:pt-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#BDAE98] bg-[#EFE8DC] px-4 py-1.5 text-xs font-bold text-[#263242] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            UK sole traders and small businesses
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.65rem,6vw,5rem)] font-extrabold leading-[1.01] tracking-tight text-[#0B1220]">
            Accounting for Sole Traders & Small Businesses
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-xl font-extrabold leading-8 text-[#28477F]">
            Bookkeeping and tax support from £30/month
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#344054]">
            Clear records, practical tax guidance, and no confusing accounting jargon.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="#contact"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold !text-white shadow-md transition hover:brightness-110 sm:w-auto"
              style={{ background: ACCENT }}
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section id="services" className="pb-14 lg:pb-18">
          <SectionHeading
            eyebrow="Services"
            title="Straightforward help for your accounts."
            description="Three simple services for staying organised, filing on time, and keeping more of what you earn."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {services.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] border border-[#BDAE98] bg-[#EFE8DC] p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7ECFA] text-[#28477F]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-[#0B1220]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="pb-14 lg:pb-18">
          <div className="rounded-[32px] border border-[#BDAE98] bg-[#EFE8DC] p-5 shadow-[0_24px_70px_rgba(55,46,34,0.16)] sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Pricing"
                title="Monthly support or one-off help."
                description="Clear prices, clear scope, and no hidden fees."
              />
              <div className="rounded-2xl border border-[#BDAE98] bg-[#FAF8F4] px-4 py-3 text-sm font-bold text-[#344054]">
                Simple pricing, no hidden fees
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {pricing.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-[26px] border p-5 ${
                    plan.highlight
                      ? "border-[#28477F] bg-[#E7ECFA] shadow-[0_20px_50px_rgba(40,71,127,0.16)]"
                      : "border-[#BDAE98] bg-[#FAF8F4]"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#28477F] px-3 py-1 text-xs font-extrabold text-white">
                      Popular
                    </span>
                  )}
                  <p className="pr-20 text-lg font-extrabold text-[#0B1220]">{plan.name}</p>
                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-5xl font-black tracking-tight text-[#0B1220]">
                      {plan.price}
                    </span>
                    <span className="pb-2 text-sm font-extrabold uppercase tracking-[0.12em] text-[#28477F]">
                      {plan.cadence}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#4B5563]">{plan.description}</p>
                  <div className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex gap-2 text-sm font-semibold text-[#344054]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="#contact"
                    className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-extrabold transition ${
                      plan.highlight
                        ? "!text-white hover:brightness-110"
                        : "border border-[#BDAE98] bg-[#EFE8DC] text-[#0B1220] hover:bg-[#E7DDCF]"
                    }`}
                    style={plan.highlight ? { background: ACCENT } : undefined}
                  >
                    Get Started
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-14 lg:pb-18">
          <div className="rounded-[28px] border border-[#BDAE98] bg-[#0B1220] p-6 text-white shadow-[0_24px_70px_rgba(55,46,34,0.24)] lg:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#BFD0FF]">
                  Why Zentra
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight lg:text-4xl">
                  Built for clarity, not accounting jargon.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {reasons.map((reason) => (
                  <div key={reason} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-[#BFD0FF]" />
                    <p className="mt-4 text-sm font-bold">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="pb-14 lg:pb-18">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              About
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B1220] lg:text-4xl">
              Accounting that feels calm and understandable.
            </h2>
            <p className="mt-4 text-base leading-8 text-[#4B5563]">
              Zentra helps sole traders and small businesses manage their finances without
              confusion or stress. We focus on clarity, simplicity, and saving you time.
            </p>
          </div>
        </section>

        <section id="contact" className="pb-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                Contact
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-[#0B1220]">
                Get started with Zentra.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#4B5563]">
                Send a short message about what you need help with and I&apos;ll reply with the next steps.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[#BDAE98] bg-[#EFE8DC] px-4 py-3 text-sm font-bold text-[#0B1220]">
                <Mail className="h-4 w-4 text-[#28477F]" />
                {CONTACT_EMAIL}
              </div>
            </div>

            <ContactForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              message={message}
              setMessage={setMessage}
              submitState={submitState}
              submitMessage={submitMessage}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B1220] lg:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[#4B5563]">{description}</p>
    </div>
  );
}

function ContactForm({
  name,
  setName,
  email,
  setEmail,
  message,
  setMessage,
  submitState,
  submitMessage,
  onSubmit,
}: {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  submitState: "idle" | "sending" | "sent" | "error";
  submitMessage: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-[#BDAE98] bg-[#EFE8DC] p-5 shadow-[0_24px_70px_rgba(55,46,34,0.18)] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitState === "sending"}
            required
            className="mt-2 h-12 w-full rounded-xl border border-[#BDAE98] bg-[#FAF8F4] px-4 text-sm outline-none transition focus:border-[#28477F] focus:ring-4 focus:ring-[#28477F]/15"
            placeholder="Your name"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitState === "sending"}
            required
            type="email"
            className="mt-2 h-12 w-full rounded-xl border border-[#BDAE98] bg-[#FAF8F4] px-4 text-sm outline-none transition focus:border-[#28477F] focus:ring-4 focus:ring-[#28477F]/15"
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <Field label="Message" className="mt-4">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={submitState === "sending"}
          required
          minLength={10}
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-[#BDAE98] bg-[#FAF8F4] px-4 py-3 text-sm outline-none transition focus:border-[#28477F] focus:ring-4 focus:ring-[#28477F]/15"
          placeholder="Tell me what you need help with."
        />
      </Field>

      {submitMessage && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            submitState === "sent"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {submitMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={submitState === "sending"}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-extrabold !text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: ACCENT }}
      >
        {submitState === "sending" ? "Sending..." : "Get Started"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#475467]">
        {label}
      </span>
      {children}
    </label>
  );
}
