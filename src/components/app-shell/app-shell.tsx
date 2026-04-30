"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calculator,
  Car,
  FileOutput,
  FilePlus,
  FolderOpen,
  type LucideIcon,
  LayoutDashboard,
  LayoutTemplate,
  Landmark,
  ListChecks,
  Menu,
  PackageOpen,
  PlusSquare,
  Receipt,
  ScanText,
  Search,
  Target,
  UserPlus,
  Settings2,
  Table2,
  TrendingUp,
  X,
} from "lucide-react";
import { appConfig } from "@/lib/config";
import type { Workspace } from "@/lib/domain/types";
import type { ViewerAccessProfile } from "@/lib/auth/viewer-access";
import { getWorkspaceRoleLabel } from "@/lib/auth/workspace-role";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ToastProvider } from "@/components/ui/toast";
import type { ViewAsMode } from "@/app/actions/view-as-actions";
import { InviteMemberDialog } from "@/components/invitations/invite-member-dialog";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

type NavigationSection = {
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
};

function buildNavigation(
  businessType: Workspace["businessType"],
  vatRegistered: Workspace["vatRegistered"],
  viewerAccess: ViewerAccessProfile,
): NavigationSection[] {
  const canSeeVatTools =
    (viewerAccess.isAccountantView || vatRegistered) && viewerAccess.canReviewTax;

  // ── Business user · Sole trader ──────────────────────────────────────────
  // Simplified view for the business owner themselves. No accounting tooling,
  // no OCR, no reconciliation runs — just sales, expenses, and basic reports.
  if (!viewerAccess.isAccountantView && businessType === "sole_trader") {
    return [
      {
        label: "Overview",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
      },
      {
        label: "Sales",
        items: [
          { href: "/clients", label: "Clients", icon: UserPlus },
          { href: "/invoices", label: "Invoices", icon: FilePlus },
        ],
      },
      {
        label: "Records",
        items: [
          { href: "/bank-statements", label: "Bank Statements", icon: Landmark },
          { href: "/bookkeeping/transactions", label: "Transactions", icon: Table2 },
          { href: "/bookkeeping/review-queue", label: "Review Queue", icon: ListChecks },
        ],
      },
      {
        label: "Claims",
        items: [
          { href: "/expenses", label: "Expenses", icon: Receipt },
          { href: "/bookkeeping/missing-receipts", label: "Missing Receipts", icon: Receipt },
          { href: "/mileage", label: "Mileage", icon: Car },
        ],
      },
      {
        label: "Tax",
        items: [
          { href: "/bookkeeping/tax-summary", label: "Tax Summary", icon: Calculator },
          ...(canSeeVatTools
            ? [{ href: "/bookkeeping/vat-reconciliation", label: "VAT Reconciliation", icon: Receipt }]
            : []),
        ],
      },
      {
        label: "Download",
        items: viewerAccess.canUseExportPack
          ? [{ href: "/export/period-pack", label: "Period Export Pack", icon: PackageOpen }]
          : [],
      },
      {
        label: "Settings",
        items: viewerAccess.canSeeSettings
          ? [{ href: "/settings", label: "Settings & Members", icon: Settings2 }]
          : [],
      },
    ].filter((section) => section.items.length > 0);
  }

  // ── Business user · General (non-sole-trader) ────────────────────────────
  if (!viewerAccess.isAccountantView) {
    return [
      {
        label: "Overview",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
      },
      {
        label: "Expenses",
        items: [
          { href: "/bank-statements", label: "Bank Statements", icon: Landmark },
          { href: "/expenses", label: "Expenses", icon: Receipt },
          { href: "/bookkeeping/missing-receipts", label: "Missing Receipts", icon: Receipt },
          { href: "/mileage", label: "Mileage", icon: Car },
        ],
      },
      {
        label: "Review",
        items: [
          { href: "/bookkeeping/transactions", label: "Transactions", icon: Table2 },
          { href: "/bookkeeping/review-queue", label: "Review Queue", icon: ListChecks },
          { href: "/bookkeeping/budget", label: "Budget vs. Actual", icon: Target },
          ...(viewerAccess.canSeeFinancialReports
            ? [{ href: "/bookkeeping/reports", label: "Business Reports", icon: BarChart3 }]
            : []),
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/bookkeeping/tax-summary", label: "Tax Summary", icon: Calculator },
          ...(canSeeVatTools
            ? [{ href: "/bookkeeping/vat-reconciliation", label: "VAT Reconciliation", icon: Receipt }]
            : []),
        ],
      },
      {
        label: "Settings",
        items: viewerAccess.canSeeSettings
          ? [{ href: "/settings", label: "Settings & Members", icon: Settings2 }]
          : [],
      },
    ].filter((section) => section.items.length > 0);
  }

  // ── Accountant / Owner ───────────────────────────────────────────────────
  // Full accounting toolset. Dashboard at top, then data ingestion, core
  // bookkeeping, reconciliation, reporting, and delivery/config at the bottom.
  return [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Ingest",
      items: [
        { href: "/bank-statements", label: "Bank Statements", icon: Landmark },
        { href: "/ocr-extraction", label: "OCR Extraction", icon: ScanText },
      ],
    },
    {
      label: "Bookkeeping",
      items: [
        { href: "/bookkeeping/transactions", label: "Transactions", icon: Table2 },
        { href: "/bookkeeping/review-queue", label: "Review Queue", icon: ListChecks },
        { href: "/expenses", label: "Expenses", icon: Receipt },
        { href: "/bookkeeping/missing-receipts", label: "Missing Receipts", icon: Receipt },
        { href: "/mileage", label: "Mileage", icon: Car },
        { href: "/bookkeeping/spending", label: "Supplier Analysis", icon: TrendingUp },
        ...(viewerAccess.canSeeTemplates
          ? [{ href: "/templates", label: "Mapping Templates", icon: LayoutTemplate }]
          : []),
      ],
    },
    {
      label: "Reconcile",
      items: [
        { href: "/runs", label: "Reconciliation Runs", icon: FolderOpen },
        ...(viewerAccess.canManageOperationalData
          ? [{ href: "/runs/new", label: "New Recon Run", icon: PlusSquare }]
          : []),
      ],
    },
    {
      label: "Reports",
      items: [
        ...(viewerAccess.canSeeFinancialReports
          ? [{ href: "/bookkeeping/reports", label: "Financial Reports", icon: BarChart3 }]
          : []),
        ...(viewerAccess.canReviewTax
          ? [{ href: "/bookkeeping/tax-summary", label: "Tax Summary", icon: Calculator }]
          : []),
        ...(canSeeVatTools
          ? [{ href: "/bookkeeping/vat-reconciliation", label: "VAT Reconciliation", icon: Receipt }]
          : []),
      ],
    },
    {
      label: "Deliver",
      items: [
        ...(viewerAccess.canSeePostingBuilder
          ? [{ href: "/posting-file-builder", label: "Posting File Builder", icon: FileOutput }]
          : []),
        ...(viewerAccess.canUseExportPack
          ? [{ href: "/export/period-pack", label: "Period Export Pack", icon: PackageOpen }]
          : []),
      ],
    },
    {
      label: "Configure",
      items: [
        ...(viewerAccess.canSeeSettings
          ? [{ href: "/settings", label: "Settings & Members", icon: Settings2 }]
          : []),
        ...(viewerAccess.canManageOperationalData || viewerAccess.canManageAccountingSettings
          ? [{ href: "/suppliers", label: "Suppliers", icon: Table2 }]
          : []),
      ],
    },
  ].filter((section) => section.items.length > 0);
}

function NavItems({
  currentPath,
  businessType,
  vatRegistered,
  viewerAccess,
  onNavigate,
}: {
  currentPath: string;
  businessType: Workspace["businessType"];
  vatRegistered: Workspace["vatRegistered"];
  viewerAccess: ViewerAccessProfile;
  onNavigate?: () => void;
}) {
  const navigation = buildNavigation(businessType, vatRegistered, viewerAccess);

  return (
    <nav className="space-y-5">
      {navigation.map((section) => (
        <div key={section.label}>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-2)]">
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
                  prefetch
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
                    isActive
                      ? "bg-white text-[var(--ink)] shadow-[var(--shadow-nav)]"
                      : "text-[var(--ink-2)] hover:bg-[rgba(14,17,22,0.04)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--accent-ink)]" : "text-[var(--muted)]")} />
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

const VIEW_AS_OPTIONS: { mode: ViewAsMode; label: string; description: string }[] = [
  { mode: "owner", label: "Owner", description: "Your real access — full control" },
  { mode: "accountant", label: "Accountant", description: "Accounting tools, no workspace admin" },
  { mode: "business_user", label: "Business user", description: "Client-facing view — simplified nav" },
];

function ViewAsSwitcher({
  currentMode,
}: {
  currentMode: ViewAsMode;
}) {
  const currentPath = usePathname();

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
        View as
      </span>
      <div className="flex items-center gap-0.5">
        {VIEW_AS_OPTIONS.map(({ mode, label }) => {
          const isActive = currentMode === mode;
          const href = `/api/view-as?mode=${mode}&returnTo=${encodeURIComponent(currentPath || "/dashboard")}`;
          return (
            <div key={mode}>
              {isActive ? (
                <span
                  title={VIEW_AS_OPTIONS.find(o => o.mode === mode)?.description}
                  className="inline-flex rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  prefetch={false}
                title={VIEW_AS_OPTIONS.find(o => o.mode === mode)?.description}
                  className="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  workspaceName,
  workspaces,
  currentWorkspaceId,
  businessType,
  vatRegistered,
  viewerAccess,
  viewAsMode = "owner",
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: string;
  businessType: Workspace["businessType"];
  vatRegistered: Workspace["vatRegistered"];
  viewerAccess: ViewerAccessProfile;
  viewAsMode?: ViewAsMode;
}) {
  const currentPath = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const businessTypeLabel =
    viewerAccess.isRealOwner && viewAsMode === "owner"
      ? "Owner override"
      : viewerAccess.isAccountantView
        ? getWorkspaceRoleLabel(viewerAccess.workspaceRole)
        : businessType === "sole_trader"
          ? `${getWorkspaceRoleLabel(viewerAccess.workspaceRole)} · Sole trader`
          : `${getWorkspaceRoleLabel(viewerAccess.workspaceRole)} · Business`;

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 pb-0.5">
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--accent)]">
        <span className="absolute left-1.5 top-2 h-0.5 w-3.5 rounded bg-white/95" />
        <span className="absolute left-1.5 top-3.5 h-0.5 w-2.5 rounded bg-white/65" />
      </span>
      <span className="text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">
        {appConfig.name}
      </span>
    </Link>
  );

  const workspaceCard = (
    <div className="rounded-2xl bg-white/70 p-1 shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)]">
      <WorkspaceSwitcher 
        workspaces={workspaces} 
        currentWorkspaceId={currentWorkspaceId} 
      />
    </div>
  );

  return (
    <ToastProvider>
    <div className="grid h-screen grid-cols-1 bg-[var(--bg)] lg:grid-cols-[236px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden h-screen shrink-0 overflow-y-auto border-r border-[var(--line)] bg-[var(--bg-side)] px-3.5 py-4 lg:flex lg:flex-col lg:gap-5">
        {brand}
        {workspaceCard}
        {viewerAccess.isRealOwner && viewAsMode !== "owner" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-600">Preview mode</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Viewing as {VIEW_AS_OPTIONS.find(o => o.mode === viewAsMode)?.label ?? viewAsMode}
            </p>
          </div>
        )}
        <NavItems currentPath={currentPath} businessType={businessType} vatRegistered={vatRegistered} viewerAccess={viewerAccess} />
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
          "fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-[var(--line)] bg-[var(--bg-side)] p-4 transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {brand}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--muted)] hover:bg-white/80"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-5">{workspaceCard}</div>
        {viewerAccess.isRealOwner && (
          <div className="mb-4">
            <ViewAsSwitcher currentMode={viewAsMode ?? "owner"} />
          </div>
        )}
        <NavItems currentPath={currentPath} businessType={businessType} vatRegistered={vatRegistered} viewerAccess={viewerAccess} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <main className="min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--bg)]/92 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--line)] bg-white text-[var(--muted)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-border-strong)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Mobile logo */}
            <span className="text-sm font-semibold text-[var(--ink)] lg:hidden">
              {appConfig.name}
            </span>
            {/* Workspace context pill - desktop only */}
            <div className="hidden shrink-0 items-center gap-3 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-sm)] lg:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--accent-softer)] text-[var(--accent-ink)] font-bold text-[10px]">
                {workspaceName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10.5px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--muted-2)]">
                  Workspace
                </span>
                <span className="font-medium leading-tight text-[var(--ink)]">
                  {workspaceName}
                </span>
              </div>
              <div className="mx-1 h-6 w-px bg-[var(--line-2)]" />
              <div className="flex flex-col">
                <span className="text-[10.5px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--muted-2)]">
                  Mode
                </span>
                <span className="font-medium leading-tight text-[var(--ink)]">
                  {businessTypeLabel}
                </span>
              </div>
            </div>

            {/* Global search bar - desktop */}
            <div className="hidden flex-1 justify-end lg:flex">
              <div className="flex w-full max-w-[360px] cursor-text items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] text-[var(--muted)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-border-strong)]">
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 select-none">Search transactions, clients, invoices...</span>
                <kbd className="hidden h-5 items-center gap-0.5 rounded bg-[#f4f2ed] px-1.5 font-mono text-[10px] text-[var(--muted)] sm:inline-flex">
                  Ctrl K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Invite member button — owners/admins only */}
              {viewerAccess.canManageMembers && (
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="hidden items-center gap-1.5 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--ink-2)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--ink)] lg:flex"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              )}
              {/* View-as switcher — only for real website owners */}
              {viewerAccess.isRealOwner && (
                <div className="hidden lg:block">
                  <ViewAsSwitcher currentMode={viewAsMode ?? "owner"} />
                </div>
              )}
              {/* Notification bell */}
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--line)] bg-white text-[var(--ink-2)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-border-strong)] lg:flex"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              <UserButton />
            </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </main>
    </div>
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </ToastProvider>
  );
}
