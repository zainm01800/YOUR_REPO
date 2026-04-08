"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusSquare, Settings2, TriangleAlert } from "lucide-react";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/runs/new", label: "New Run", icon: PlusSquare },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/runs/run_april_close/exceptions", label: "Exceptions", icon: TriangleAlert },
];

export function AppShell({
  children,
  workspaceName,
}: {
  children: React.ReactNode;
  workspaceName: string;
}) {
  const currentPath = usePathname();

  return (
    <div className="flex min-h-screen bg-[var(--color-page)]">
      <aside className="hidden w-72 border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-6 lg:block">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            {appConfig.name}
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--color-foreground)]">
            {workspaceName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Reconciliation, review, and finance-ready export in one workflow.
          </p>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-white text-[var(--color-foreground)] shadow-[0_10px_24px_rgba(15,23,31,0.07)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-white/80 hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-end">
            <UserButton />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
