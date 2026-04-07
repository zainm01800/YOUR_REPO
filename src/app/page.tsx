import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/lib/config";

const proofPoints = [
  "Upload one transaction export and a batch of receipts",
  "Extract supplier, date, VAT, net, gross, and document numbers",
  "Flag mismatches, duplicates, missing receipts, and missing codes",
  "Review exceptions in a finance-first table and export a clean file",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-4 py-6 sm:px-6 lg:px-10">
      <section className="rounded-[36px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_30px_120px_rgba(15,23,31,0.08)] lg:px-10 lg:py-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up">
                <Button className="gap-2">
                  Start demo workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">View product demo</Button>
              </Link>
            </div>
            <div className="mt-10 grid gap-3">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 text-sm leading-6 text-[var(--color-foreground)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />
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
                  Why teams buy this
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

      <section className="space-y-6">
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
    </main>
  );
}
