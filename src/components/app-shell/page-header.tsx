import { Card } from "@/components/ui/card";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          {eyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex gap-3">{actions}</div> : null}
    </Card>
  );
}

