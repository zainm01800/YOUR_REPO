import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ProductPreview } from "@/components/landing/product-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/lib/config";

const proofPoints = [
  "Upload one transaction export and a batch of receipts",
  "Extract supplier, date, VAT, net, gross, and document numbers",
  "Flag mismatches, duplicates, missing receipts, and missing codes",
  "Review exceptions in a finance-first table and export a clean file",
];

const steps = [
  {
    step: "01",
    title: "Upload your files",
    description: "Drop in a CSV or Excel transaction export alongside your receipts, PDFs, or a ZIP of images. ClearMatch handles the rest.",
  },
  {
    step: "02",
    title: "Auto-match and extract",
    description: "The matching engine scores each transaction against documents using amount, date, supplier, and reference signals. OCR runs in your browser.",
  },
  {
    step: "03",
    title: "Review exceptions",
    description: "Every mismatch, missing receipt, duplicate, and suspicious VAT rate is surfaced in a finance-first review table — not buried in a spreadsheet.",
  },
  {
    step: "04",
    title: "Export clean data",
    description: "Download a finance-ready CSV or Excel file with VAT codes, GL codes, match status, and notes. One click to an ERP-ready posting file.",
  },
];

export default function Home() {
  return (
    <>
      <LandingNav />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-10">
        {/* Hero */}
        <section className="rounded-[36px] border border-[var(--color-border)] bg-white px-6 py-10 shadow-[0_30px_120px_rgba(15,23,31,0.08)] lg:px-12 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-muted-foreground)]">
                Reconciliation + validation + review workflow
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-[var(--color-foreground)] lg:text-6xl">
                Upload transactions and receipts. Get a reconciled, reviewable export.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted-foreground)]">
                {appConfig.name} is built for finance teams and bookkeepers who still
                live in Excel and card-export files. Match documents to spend, extract
                VAT, flag what needs attention, and export clean data without stitching
                everything together manually.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/sign-up">
                  <Button className="gap-2">
                    Start free workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="secondary">Sign in</Button>
                </Link>
              </div>
              <div className="mt-10 grid gap-3">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 text-sm leading-6 text-[var(--color-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="relative overflow-hidden bg-[linear-gradient(180deg,#143c30_0%,#1f5c45_100%)] text-[var(--color-accent-foreground)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_40%)]" />
              <div className="relative space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    Why teams choose this
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    Automation where it helps, control where it matters.
                  </h2>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-sm text-white/70">Exception review</div>
                    <div className="mt-2 text-3xl font-semibold">First-class</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-sm text-white/70">Repeatable uploads</div>
                    <div className="mt-2 text-3xl font-semibold">Saved templates</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-sm text-white/70">Finance-ready output</div>
                    <div className="mt-2 text-3xl font-semibold">CSV + Excel export</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Product preview */}
        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              The product
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              A finance-first review table, not a scanning tool.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
              Approve rows, override codes, rematch documents, and export — all in one place. No more spreadsheet-stitching.
            </p>
          </div>
          <ProductPreview />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Four steps from raw files to clean export.
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,31,0.06)]"
              >
                <div className="font-mono text-3xl font-bold text-[var(--color-accent)] opacity-40">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-foreground)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 space-y-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Product focus
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Built for the close process, not for scanning receipts in isolation.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
              The first niche is finance teams working from Excel or CSV transaction
              exports and a batch of receipts. The workflow is designed for repeatable
              month-end reconciliation, exception review, and clean exports back to
              finance.
            </p>
          </div>
          <FeatureGrid />
        </section>

        {/* CTA */}
        <section className="rounded-[36px] bg-[linear-gradient(180deg,#143c30_0%,#1f5c45_100%)] px-8 py-14 text-center shadow-[0_30px_120px_rgba(15,23,31,0.12)]">
          <h2 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Ready to stop stitching spreadsheets?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/70">
            Start a free workspace and run your first reconciliation in minutes. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/sign-up">
              <Button className="gap-2 bg-white text-[var(--color-accent)] hover:bg-white/90 shadow-none">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign in
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
