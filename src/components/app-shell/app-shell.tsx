"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileOutput,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  PlusSquare,
  Settings2,
} from "lucide-react";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Reconciliation",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/runs/new", label: "New run", icon: PlusSquare },
      { href: "/runs", label: "All runs", icon: FolderOpen },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Output",
    items: [
      { href: "/posting-file-builder", label: "Posting File Builder", icon: FileOutput },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
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
    <div className="flex h-screen bg-[var(--color-page)]">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-5 lg:block">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            {appConfig.name}
          </div>
          <h1 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
            {workspaceName}
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-[var(--color-muted-foreground)]">
            Reconciliation &amp; posting workflow
          </p>
        </div>

        <nav className="mt-6 space-y-5">
          {navigation.map((section) => (
            <div key={section.label}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/runs"
                      ? currentPath === "/runs"
                      : currentPath.startsWith(item.href) && item.href !== "/dashboard"
                        ? true
                        : currentPath === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-white text-[var(--color-foreground)] shadow-[0_4px_12px_rgba(15,23,31,0.07)]"
                          : "text-[var(--color-muted-foreground)] hover:bg-white/80 hover:text-[var(--color-foreground)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex items-center justify-end">
            <UserButton />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
