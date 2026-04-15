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
  description: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <Card className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
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

