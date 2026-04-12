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
    <>
      <LandingNav />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-10">
        <section className="overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-white shadow-[0_34px_120px_rgba(15,23,31,0.10)]">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="px-6 py-10 lg:px-10 lg:py-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Reconciliation workflow for finance teams
              </div>

              <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-[var(--color-foreground)] lg:text-6xl">
                Reconcile transactions, validate VAT, review exceptions, and export the final file.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted-foreground)]">
                {appConfig.name} is for finance teams and bookkeepers who work from transaction exports and invoice batches,
                but need something stronger than email folders, OCR tools, and stitched spreadsheets. Upload the files you
                already have, work the exceptions properly, and hand back a clean finance-ready output.
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

              <div className="mt-8 grid gap-3">
                {heroProof.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-6 text-[var(--color-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`#${link.id}`}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] bg-[linear-gradient(180deg,#133b2f_0%,#1f5c45_100%)] p-5 text-white lg:border-l lg:border-t-0 lg:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Product snapshot
                  </div>
                  <div className="mt-1 text-xl font-semibold">What the product does today</div>
                </div>
                <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                  Live workflow
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Review workspace", value: "Spreadsheet-style" },
                    { label: "VAT controls", value: "Country-aware" },
                    { label: "Exports", value: "CSV, Excel, posting files" },
                    { label: "Audit trail", value: "Saved runs + export history" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4">
                      <div className="text-sm text-white/70">{item.label}</div>
                      <div className="mt-2 text-xl font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#f8f4ed] text-[var(--color-foreground)] shadow-[0_24px_60px_rgba(8,19,16,0.22)]">
                  <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-white px-4 py-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <div className="ml-3 rounded-md bg-[var(--color-panel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                      Review workspace
                    </div>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-[1fr_220px]">
                    <div className="p-4">
                      <div className="mb-3 grid grid-cols-4 gap-2">
                        {[
                          ["Matched", "12"],
                          ["Needs review", "6"],
                          ["Locked", "1 run"],
                          ["Exported", "4 files"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                              {label}
                            </div>
                            <div className="mt-1 text-lg font-semibold">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
                        <table className="min-w-full text-left text-xs">
                          <thead className="bg-[var(--color-panel)]">
                            <tr>
                              {["Supplier", "Original value", "Gross", "Net", "VAT", "VAT code", "GL code"].map((heading) => (
                                <th
                                  key={heading}
                                  className="px-3 py-2.5 font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]"
                                >
                                  {heading}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]">
                            {[
                              ["ABC Seller", "£3,360.00", "£360.00", "£300.00", "£60.00", "GB20", "650060"],
                              ["ABC Seller", "", "£3,000.00", "£3,000.00", "£0.00", "GB0", "650060"],
                              ["AWS Europe", "US$440.00", "£327.26", "£327.26", "£0.00", "Not claimable", "620000"],
                              ["Uber", "£42.60", "£42.60", "£35.50", "£7.10", "GB20", "650060"],
                            ].map((row, index) => (
                              <tr key={`${row[0]}_${index}`} className={index % 2 === 0 ? "bg-[rgba(25,94,65,0.035)]" : "bg-white"}>
                                {row.map((value, cellIndex) => (
                                  <td key={`${row[0]}_${cellIndex}`} className="px-3 py-2.5 text-[var(--color-foreground)]">
                                    {value || <span className="text-[var(--color-muted-foreground)]">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr className="border-t border-[var(--color-border)] bg-[#f1ece3] font-semibold">
                              <td className="px-3 py-2.5">Totals</td>
                              <td className="px-3 py-2.5">£3,842.60</td>
                              <td className="px-3 py-2.5">£3,729.86</td>
                              <td className="px-3 py-2.5">£3,662.76</td>
                              <td className="px-3 py-2.5">£67.10</td>
                              <td className="px-3 py-2.5">Mixed</td>
                              <td className="px-3 py-2.5">Mixed</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-[var(--color-border)] bg-white p-4 lg:border-l lg:border-t-0">
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                            Current controls
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span>VAT sync</span>
                              <span className="font-semibold text-[var(--color-accent)]">Live</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Period lock</span>
                              <span className="font-semibold text-[var(--color-accent)]">Enabled</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Export history</span>
                              <span className="font-semibold text-[var(--color-accent)]">Tracked</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                            Output options
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div>CSV / Excel export</div>
                            <div>Posting-file builder</div>
                            <div>Supplier analysis</div>
                            <div>VAT summary</div>
                          </div>
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Current product
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              This is already more than document extraction.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted-foreground)]">
              The product now covers the finance workflow around the receipt, not just the receipt itself. That means
              calculations, controls, history, settings, export structure, and review discipline all sit in one place.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {capabilityCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card key={card.title} className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{card.title}</h3>
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{card.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              The month-end path from upload to final posting file.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-5">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,31,0.06)]"
              >
                <div className="font-mono text-3xl font-bold text-[var(--color-accent)] opacity-35">{item.step}</div>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-foreground)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="controls" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-5 bg-[linear-gradient(180deg,#133b2f_0%,#1f5c45_100%)] text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Built for control
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Finance can trust the output because the workflow is opinionated.
              </h2>
            </div>

            <div className="grid gap-3">
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
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-white/80" />
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/70">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  Controls and calculations
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  Product improvements already reflected in the app
                </h3>
              </div>
              <div className="grid gap-3">
                {controlPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-6 text-[var(--color-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  Best fit
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  Still deliberately focused on one strong niche
                </h3>
              </div>
              <div className="grid gap-3">
                {nicheBullets.map((point) => (
                  <div key={point} className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    {point}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="rounded-[40px] bg-[linear-gradient(180deg,#133b2f_0%,#1f5c45_100%)] px-8 py-14 text-center shadow-[0_30px_120px_rgba(15,23,31,0.12)]">
          <h2 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Give finance a review workflow, not another inbox of files.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/72">
            Start a workspace, upload the exports and invoices you already have, and move from extraction to approval,
            reporting, and ERP-ready output in one product.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/sign-up">
              <Button className="gap-2 bg-white text-[var(--color-accent)] shadow-none hover:bg-white/90">
                Start free workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="border border-white/15 text-white hover:bg-white/10 hover:text-white"
              >
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
