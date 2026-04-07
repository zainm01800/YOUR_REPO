import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <div className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
        {value}
      </div>
      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{helper}</p>
    </Card>
  );
}
