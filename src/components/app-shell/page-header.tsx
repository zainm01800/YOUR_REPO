import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <Card className="flex flex-col gap-5 border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)] lg:flex-row lg:items-end lg:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-[var(--muted)]">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[var(--color-foreground)] hover:underline decoration-[0.5px]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-foreground)] font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </Card>
  );
}
