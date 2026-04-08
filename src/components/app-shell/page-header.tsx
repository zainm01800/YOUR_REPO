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
    <Card className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          {eyebrow}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </Card>
  );
}

