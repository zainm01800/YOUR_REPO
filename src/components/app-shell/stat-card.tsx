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
    <Card className="space-y-4">
      <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{label}</p>
      <div className="text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
        {value}
      </div>
      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{helper}</p>
    </Card>
  );
}
