import { cn } from "@/lib/utils";

const styles = {
  neutral:
    "border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted-foreground)]",
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-800",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-800",
  danger: "border border-rose-200 bg-rose-50 text-rose-800",
  info: "border border-sky-200 bg-sky-50 text-sky-800",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof styles;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

