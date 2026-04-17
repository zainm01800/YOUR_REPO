"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  FileOutput,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Landmark,
  Menu,
  PackageOpen,
  PlusSquare,
  Settings2,
  Table2,
  TrendingUp,
  X,
} from "lucide-react";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ToastProvider } from "@/components/ui/toast";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const navigation = [
  {
    label: "Ingest",
    items: [
      { href: "/bank-statements", label: "Bank Statements", icon: Landmark },
      { href: "/ocr-extraction", label: "OCR Extraction", icon: PackageOpen },
    ],
  },
  {
    label: "Process",
    items: [
      { href: "/bookkeeping/transactions", label: "Transactions", icon: Table2 },
      { href: "/bookkeeping/spending", label: "Supplier Analysis", icon: TrendingUp },
      { href: "/templates", label: "Mapping Templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Reconcile",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/runs", label: "Reconciliation Runs", icon: FolderOpen },
      { href: "/runs/new", label: "New Recon Run", icon: PlusSquare },
    ],
  },
  {
    label: "Report",
    items: [
      { href: "/bookkeeping/reports", label: "Financial Reports", icon: BarChart3 },
      { href: "/bookkeeping/tax-summary", label: "VAT & Tax Summary", icon: Calculator },
    ],
  },
  {
    label: "Deliver",
    items: [
      { href: "/posting-file-builder", label: "Posting File Builder", icon: FileOutput },
      { href: "/export/period-pack", label: "Period Export Pack", icon: PackageOpen },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/settings", label: "Settings & Members", icon: Settings2 },
      { href: "/suppliers", label: "Suppliers", icon: Table2 },
    ],
  },
];

function NavItems({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  return (
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
                  onClick={onNavigate}
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
  );
}

export function AppShell({
  children,
  workspaceName,
  workspaces,
  currentWorkspaceId,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: string;
}) {
  const currentPath = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const workspaceCard = (
    <div className="mb-4">
      <WorkspaceSwitcher 
        workspaces={workspaces} 
        currentWorkspaceId={currentWorkspaceId} 
      />
    </div>
  );

  return (
    <ToastProvider>
    <div className="flex h-screen bg-[var(--color-page)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-5 lg:block">
        {workspaceCard}
        <NavItems currentPath={currentPath} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-5 transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {workspaceCard}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] hover:bg-white/80"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavItems currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] shadow-sm transition hover:bg-[var(--color-panel)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Mobile logo */}
            <span className="text-sm font-semibold text-[var(--color-foreground)] lg:hidden">
              {appConfig.name}
            </span>
            {/* Workspace Context Strip */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-white border border-[var(--color-border)] shadow-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold text-[10px]">
                {workspaceName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] leading-none">
                  Workspace
                </span>
                <span className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">
                  {workspaceName}
                </span>
              </div>
              <div className="h-6 w-px bg-[var(--color-border)] mx-1" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] leading-none">
                  Period
                </span>
                <span className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:ml-auto">
              <UserButton />
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
    </ToastProvider>
  );
}
