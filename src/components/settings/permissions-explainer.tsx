import { ShieldCheck } from "lucide-react";
import type { ViewerAccessProfile } from "@/lib/auth/viewer-access";

export function PermissionsExplainer({
  viewerAccess,
}: {
  viewerAccess: ViewerAccessProfile;
}) {
  const rows = [
    {
      label: "Business owner",
      canSee: "Upload records, fix simple issues, view estimates, and share a review pack.",
      hidden: "Full financial statements, posting files, advanced mappings, and final review tools.",
    },
    {
      label: "Bookkeeper",
      canSee: "Upload, categorise, reconcile, edit suppliers, and work day-to-day records.",
      hidden: "Workspace ownership, billing/deletion, and final tax sign-off.",
    },
    {
      label: "Tax reviewer",
      canSee: "Tax/VAT summaries, export packs, and review outputs.",
      hidden: "Operational edits unless separately granted.",
    },
    {
      label: "Accountant admin",
      canSee: "Advanced settings, reports, period controls, mappings, and posting/export tools.",
      hidden: "Workspace deletion and owner-only admin unless invited as owner.",
    },
  ];

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-foreground)]">
            What each role can see
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Zentra is designed so clients prepare records, while accountants review and finalise.
            Your current view is{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {viewerAccess.isWebsiteOwner
                ? "website owner / unrestricted"
                : viewerAccess.isAccountantView
                  ? "accountant-style"
                  : "client prep"}
            </span>
            .
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl bg-[var(--color-panel)] p-4">
            <p className="text-sm font-bold text-[var(--color-foreground)]">{row.label}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
              <span className="font-semibold text-emerald-700">Can see:</span> {row.canSee}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              <span className="font-semibold text-amber-700">Held back:</span> {row.hidden}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

