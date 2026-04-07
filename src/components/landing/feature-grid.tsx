import { AlertTriangle, FileSpreadsheet, Files, SearchCheck, ShieldCheck, Table2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Upload transactions and receipts together",
    description:
      "Start from the files finance teams already have: card exports, AP spreadsheets, PDFs, and receipt batches.",
    icon: FileSpreadsheet,
  },
  {
    title: "Match with explainable logic",
    description:
      "Deterministic scoring combines amount, date, supplier, reference, employee, and currency signals.",
    icon: SearchCheck,
  },
  {
    title: "Surface exceptions first",
    description:
      "Missing receipts, mismatches, low-confidence extractions, duplicates, and suspicious VAT rates are all called out clearly.",
    icon: AlertTriangle,
  },
  {
    title: "Review in a finance-style table",
    description:
      "Approve, override VAT or GL codes, rematch documents, mark no-receipt-required, and keep a clean audit trail.",
    icon: Table2,
  },
  {
    title: "Support repeatable uploads",
    description:
      "Saved mapping templates make recurring card and AP exports much faster for finance and bookkeeping teams.",
    icon: Files,
  },
  {
    title: "Export a finance-ready file",
    description:
      "Get a clean Excel or CSV export with supplier, net, VAT, gross, VAT code, GL code, notes, and match status.",
    icon: ShieldCheck,
  },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;

        return (
          <Card key={feature.title} className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-accent)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                {feature.title}
              </h3>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                {feature.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

