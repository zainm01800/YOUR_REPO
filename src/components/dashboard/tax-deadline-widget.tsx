"use client";

import { Card } from "@/components/ui/card";

interface TaxDeadlineWidgetProps {
  vatRegistered: boolean;
  showMtd?: boolean;
}

interface Deadline {
  label: string;
  date: string;
  description?: string;
  vatOnly?: boolean;
  mtdOnly?: boolean;
}

function getDeadlines(): Deadline[] {
  const now = new Date();
  // Tax year starts April 6. If we're in Jan–Mar, tax year started previous calendar year.
  const TAX_YEAR = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  return [
    // VAT quarters (standard quarterly)
    { label: "VAT Return Q1", date: `${TAX_YEAR + 1}-08-07`, description: "May–Jul quarter", vatOnly: true },
    { label: "VAT Return Q2", date: `${TAX_YEAR + 1}-11-07`, description: "Aug–Oct quarter", vatOnly: true },
    { label: "VAT Return Q3", date: `${TAX_YEAR + 2}-02-07`, description: "Nov–Jan quarter", vatOnly: true },
    { label: "VAT Return Q4", date: `${TAX_YEAR + 2}-05-07`, description: "Feb–Apr quarter", vatOnly: true },
    // Self Assessment
    { label: "Self Assessment deadline", date: `${TAX_YEAR + 2}-01-31`, description: "Online filing + payment" },
    { label: "Payment on account (1st)", date: `${TAX_YEAR + 2}-01-31`, description: "50% of prior year bill" },
    { label: "Payment on account (2nd)", date: `${TAX_YEAR + 2}-07-31`, description: "50% of prior year bill" },
    // MTD Income Tax (new from April 2026)
    { label: "MTD Q1 update", date: `${TAX_YEAR + 1}-08-07`, description: "Apr–Jun quarterly update to HMRC", mtdOnly: true },
    { label: "MTD Q2 update", date: `${TAX_YEAR + 1}-11-07`, description: "Jul–Sep quarterly update to HMRC", mtdOnly: true },
    { label: "MTD Q3 update", date: `${TAX_YEAR + 2}-02-07`, description: "Oct–Dec quarterly update to HMRC", mtdOnly: true },
    { label: "MTD Q4 update", date: `${TAX_YEAR + 2}-05-07`, description: "Jan–Mar quarterly update to HMRC", mtdOnly: true },
    // Tax year end
    { label: "Tax year end", date: `${TAX_YEAR + 1}-04-05`, description: `End of ${TAX_YEAR}/${String(TAX_YEAR + 1).slice(2)} tax year` },
  ];
}

function formatDeadlineDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string, today: Date): number {
  const target = new Date(dateStr + "T00:00:00");
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = target.getTime() - todayMidnight.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type StatusColor = "red" | "amber" | "green" | "past";

function getStatus(days: number): StatusColor {
  if (days < 0) return "past";
  if (days < 14) return "red";
  if (days < 30) return "amber";
  return "green";
}

const DOT_CLASSES: Record<StatusColor, string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
  past: "bg-[var(--color-muted-foreground)]",
};

export function TaxDeadlineWidget({ vatRegistered, showMtd = false }: TaxDeadlineWidgetProps) {
  const today = new Date();

  const filtered = getDeadlines()
    .filter((d) => {
      if (d.vatOnly && !vatRegistered) return false;
      if (d.mtdOnly && !showMtd) return false;
      return true;
    })
    .map((d) => ({ ...d, days: daysUntil(d.date, today) }))
    .sort((a, b) => a.days - b.days);

  // Show next 5 upcoming (days >= 0), pad with most recent past if needed
  const upcoming = filtered.filter((d) => d.days >= 0).slice(0, 5);
  const past = filtered.filter((d) => d.days < 0).slice(-Math.max(0, 5 - upcoming.length));
  const toShow = [...past.sort((a, b) => a.days - b.days), ...upcoming].slice(0, 5);

  return (
    <Card className="space-y-0 overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Tax calendar
        </p>
        <h2 className="mt-1 text-base font-bold text-[var(--color-foreground)]">Tax deadlines</h2>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {toShow.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No upcoming deadlines found.
          </div>
        ) : (
          toShow.map((d, i) => {
            const status = getStatus(d.days);
            const isPast = status === "past";
            return (
              <div
                key={`${d.label}-${d.date}-${i}`}
                className={`flex items-start gap-3 px-5 py-3 ${isPast ? "opacity-50" : ""}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_CLASSES[status]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">
                      {d.label}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                      {isPast ? "passed" : `in ${d.days} day${d.days !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span className="text-xs font-medium text-[var(--color-foreground)]">
                      {formatDeadlineDate(d.date)}
                    </span>
                    {d.description && (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {d.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3">
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          Dates based on standard UK tax calendar. Always verify with your accountant.
        </p>
      </div>
    </Card>
  );
}
