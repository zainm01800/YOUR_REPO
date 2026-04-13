import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FolderCog,
  SearchCheck,
  Settings2,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/lib/config";

const heroProof = [
  "Review rows in an Excel-style workspace with totals, filters, notes, and audit history",
  "Apply VAT rules, FX conversion, GL mappings, and lock periods once finance signs off",
  "Generate CSV, Excel, and posting-template outputs without rebuilding the file manually",
];

const capabilityCards = [
  {
    icon: Table2,
    title: "Review workspace first",
    description:
      "Inline review table, grouped multi-line VAT rows, bulk GL assignment, row notes, and approval progress.",
  },
  {
    icon: Calculator,
    title: "VAT and FX controls",
    description:
      "Country-aware VAT claimability, live VAT-rule sync, native-currency original value, and home-currency reporting.",
  },
  {
    icon: SearchCheck,
    title: "Exception handling",
    description:
      "Duplicate receipts, duplicate transactions, missing codes, missing receipts, suspicious VAT, and mismatch triage.",
  },
  {
    icon: FolderCog,
    title: "Settings-driven workflows",
    description:
      "Import or edit GL rules and VAT codes, save mapping templates, and keep workspace tolerances consistent.",
  },
  {
    icon: FileSpreadsheet,
    title: "Posting-file builder",
    description:
      "Map reconciled data into real posting templates and generate ERP-ready files without rekeying invoice values.",
  },
  {
    icon: BarChart3,
    title: "Management reporting",
    description:
      "Dashboard trend lines, top suppliers, export history, and a supplier analysis page for audit and close reviews.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create a run and upload files",
    description:
      "Bring in the transaction export you already have, plus PDFs, images, or ZIPs of receipts and invoices.",
  },
  {
    step: "02",
    title: "Process with rules, extraction, and matching",
    description:
      "ClearMatch extracts fields, applies VAT logic, detects duplicates, and scores candidate matches with explainable logic.",
  },
  {
    step: "03",
    title: "Work the exceptions properly",
    description:
      "Use the review table to resolve missing VAT codes, assign GL codes in bulk, leave notes, and verify tricky rows.",
  },
  {
    step: "04",
    title: "Lock the period when it is clean",
    description:
      "Once the review is approved, lock the run to make it read-only and preserve the final state for export and audit.",
  },
  {
    step: "05",
    title: "Download the outputs finance needs",
    description:
      "Export CSV, Excel, or a posting-template workbook with export history stored against the run.",
  },
];

const controlPoints = [
  "Duplicate transaction detection before the review team wastes time on a dirty import",
  "Live VAT-rate sync plus editable VAT and GL rule tables in Settings",
  "Country-aware non-claimable VAT handling for foreign invoices",
  "Export history per run so finance can prove what was downloaded and when",
  "Locked periods enforced at the API layer, not only in the interface",
  "Supplier spend analysis and spend-over-time reporting across runs",
];

const nicheBullets = [
  "Finance teams reconciling card exports, AP files, and uploaded invoices",
  "Bookkeepers who still close in Excel but need a cleaner workflow",
  "SMEs that want repeatable review and export controls before ERP upload",
];

const navLinks = [
  { id: "features", label: "Current product" },
  { id: "how-it-works", label: "Workflow" },
  { id: "controls", label: "Controls" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden pt-16">
      <div className="hero-glow" />
      <LandingNav />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-10">
        <section className="animate-in rounded-[48px] border border-[var(--color-border)] bg-white/40 shadow-[0_34px_120px_rgba(15,23,31,0.08)] backdrop-blur-sm transition-all duration-700 hover:shadow-[0_40px_140px_rgba(15,23,31,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
            <div className="px-6 py-12 lg:px-12 lg:py-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] shadow-sm backdrop-blur-md transition-transform hover:scale-105">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
                Reconciliation workflow for finance teams
              </div>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-[var(--color-foreground)] lg:text-7xl">
                Reconcile, <span className="text-[var(--color-accent)]">validate</span>, and export.
              </h1>

              <p className="mt-8 max-w-2xl text-xl leading-8 text-[var(--color-muted-foreground)]">
                {appConfig.name} is the opinionated workflow for finance teams who need something stronger than email folders
                and stitched spreadsheets. Reconcile transaction exports at scale with absolute confidence.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/sign-up">
                  <Button className="h-12 gap-2 rounded-2xl px-8 text-base shadow-[0_10px_30px_rgba(25,94,65,0.2)] transition-all hover:scale-105 hover:bg-[var(--color-accent-strong)]">
                    Start free workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="secondary" className="h-12 rounded-2xl px-8 text-base transition-all hover:bg-white">
                    Sign in
                  </Button>
                </Link>
              </div>

              <div className="mt-12 grid gap-4">
                {heroProof.map((point) => (
                  <div
                    key={point}
                    className="group flex items-start gap-4 rounded-3xl border border-[var(--color-border)] bg-white/40 p-5 text-sm leading-7 text-[var(--color-foreground)] transition-all hover:bg-white/60 hover:shadow-sm"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] group-hover:scale-110">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-wrap gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`#${link.id}`}
                    className="rounded-2xl border border-[var(--color-border)] bg-white/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] backdrop-blur-sm transition-all hover:border-[var(--color-accent)] hover:bg-white/50 hover:text-[var(--color-accent)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mesh-gradient relative flex flex-col justify-center overflow-visible p-6 text-white lg:rounded-r-[48px] lg:p-10">
              {/* Floating Decorative Elements */}
              <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl animate-pulse" />
              <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />

              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
                      Product snapshot
                    </div>
                    <div className="text-3xl font-bold tracking-tight">System behavior</div>
                  </div>
                  <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl shadow-lg">
                    Active Environment
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { label: "Interface", value: "Review-first" },
                    { label: "Controls", value: "Locked periods" },
                    { label: "Security", value: "Multi-tenant" },
                    { label: "Output", value: "ERP-ready files" },
                  ].map((item) => (
                    <div key={item.label} className="group rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-xl">
                      <div className="text-xs font-medium text-white/40">{item.label}</div>
                      <div className="mt-2 text-xl font-bold tracking-tight group-hover:text-white">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* The Mockup - Aggressive Cutoff Fix */}
                <div className="relative">
                  <div className="hover-lift absolute -right-4 top-0 h-full w-full rounded-[40px] bg-[var(--color-accent)]/10 blur-2xl lg:-right-12" />
                  <div className="hover-lift relative z-20 overflow-visible rounded-[32px] border border-white/20 bg-white/10 p-1.5 backdrop-blur-2xl shadow-[0_48px_100px_rgba(0,0,0,0.3)] lg:-mr-24">
                    <div className="overflow-hidden rounded-[28px] bg-[#f8f6f2]/95 backdrop-blur-sm">
                      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-white/80 px-6 py-5 backdrop-blur-md">
                        <div className="flex gap-2">
                          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                        </div>
                        <div className="ml-6 rounded-lg bg-[var(--color-panel)] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                          Production workspace
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="mb-5 grid grid-cols-4 gap-4">
                          {[
                            ["Matched", "12"],
                            ["To review", "6"],
                            ["Locked", "Run 004"],
                            ["Files", "4 CSVs"],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white">
                              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                                {label}
                              </div>
                              <div className="mt-1.5 text-lg font-black text-[var(--color-foreground)]">{value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl">
                          <table className="min-w-full text-left text-[12px]">
                            <thead className="bg-[var(--color-panel)]/80 text-[var(--color-muted-foreground)] backdrop-blur-sm">
                              <tr>
                                {["Supplier", "Gross", "Net", "VAT", "GL"].map((heading) => (
                                  <th
                                    key={heading}
                                    className="px-5 py-4 font-black uppercase tracking-[0.2em]"
                                  >
                                    {heading}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                              {[
                                ["Amazon.co.uk", "£420.00", "£350.00", "£70.00", "6500"],
                                ["Stripe Tech", "£2,400.00", "£2,400.00", "£0.00", "6200"],
                                ["Uber", "£12.60", "£10.50", "£2.10", "6500"],
                              ].map((row, index) => (
                                <tr key={index} className="transition-colors hover:bg-[var(--color-accent-soft)]">
                                  {row.map((value, cellIndex) => (
                                    <td key={cellIndex} className="whitespace-nowrap px-5 py-4 font-medium text-[var(--color-foreground)]">
                                      {value}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              <tr className="border-t border-[var(--color-border)] bg-[#f1ece3] font-black">
                                <td className="px-5 py-4">Summary</td>
                                <td className="px-5 py-4 text-[var(--color-accent)]">£2,832.60</td>
                                <td className="px-5 py-4">£2,760.50</td>
                                <td className="px-5 py-4">£72.10</td>
                                <td className="px-5 py-4 text-[var(--color-muted-foreground)]">OK</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Modular Capabilities
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
              This is already more than document extraction.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted-foreground)]">
              The product now covers the finance workflow around the receipt, not just the receipt itself. That means
              calculations, controls, history, settings, export structure, and review discipline all sit in one place.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {capabilityCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card key={card.title} className="hover-lift card-premium flex flex-col gap-6 border-none bg-white/60 shadow-md backdrop-blur-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition-transform hover:rotate-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-[var(--color-foreground)]">{card.title}</h3>
                    <p className="text-sm leading-7 text-[var(--color-muted-foreground)]">{card.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              The Roadmap
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
              The month-end path from upload to final posting file.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-5">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="hover-lift group relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-white p-6 shadow-sm transition-all hover:shadow-xl"
              >
                <div className="absolute -right-4 -top-4 font-mono text-7xl font-bold text-[var(--color-accent)] opacity-[0.03] transition-all group-hover:scale-110">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="font-mono text-2xl font-bold text-[var(--color-accent)] opacity-40">{item.step}</div>
                  <h3 className="mt-6 text-lg font-bold text-[var(--color-foreground)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="controls" className="grid gap-10 lg:grid-cols-2">
          <Card className="mesh-gradient relative overflow-hidden rounded-[48px] p-10 text-white border-none shadow-2xl">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            
            <div className="relative z-10 space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/50">
                  Built for control
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight leading-tight">
                  Finance can trust the output because the workflow is opinionated.
                </h2>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    icon: ShieldCheck,
                    label: "Lock periods after sign-off",
                    text: "Runs become read-only once a period is locked, and the lock is enforced through the data layer.",
                  },
                  {
                    icon: Settings2,
                    label: "Control the rule base",
                    text: "Workspace settings now manage GL rules, VAT rules, tolerance settings, and mapping imports.",
                  },
                  {
                    icon: Clock3,
                    label: "Track what was exported",
                    text: "Each run keeps export history so the team can see which files were generated and when.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="group rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10">
                      <div className="flex items-center gap-3 text-base font-bold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white group-hover:bg-white group-hover:text-[var(--color-accent)] transition-all">
                          <Icon className="h-4 w-4" />
                        </div>
                        {item.label}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/60">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="card-premium space-y-6 rounded-[40px] border-[var(--color-border)] shadow-lg hover:shadow-2xl transition-all">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                  Continuous Improvement
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
                  Native controls already in the app
                </h3>
              </div>
              <div className="grid gap-3">
                {controlPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-4 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4 text-sm font-medium transition-all hover:bg-white hover:shadow-md"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="mesh-gradient relative overflow-hidden rounded-[40px] px-8 py-10 text-white shadow-xl border-none">
              <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative z-10 space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                    Target User
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">
                    Focused on the high-end niche
                  </h3>
                </div>
                <div className="grid gap-3">
                  {nicheBullets.map((point) => (
                    <div key={point} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm leading-6 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20">
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mesh-gradient relative overflow-hidden rounded-[64px] px-8 py-20 text-center shadow-[0_30px_120px_rgba(15,23,31,0.25)] border-none">
          <div className="absolute inset-0 bg-white/5 opacity-50" />
          <div className="relative z-10">
            <h2 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white lg:text-6xl leading-[1.1]">
              Give finance a review workflow, not another inbox of files.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/70">
              Start a workspace, upload the exports and invoices you already have, and move from extraction to approval,
              reporting, and ERP-ready output in one product.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link href="/sign-up">
                <Button className="h-14 gap-3 rounded-2xl bg-white px-10 text-lg font-bold text-[var(--color-accent)] shadow-2xl transition-all hover:scale-105 hover:bg-white/90">
                  Start free workspace
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button
                  variant="ghost"
                  className="h-14 rounded-2xl border border-white/20 px-10 text-lg font-bold text-white transition-all hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
