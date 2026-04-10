import Link from "next/link";
import { appConfig } from "@/lib/config";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-base font-semibold text-[var(--color-foreground)]">
                {appConfig.name}
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--color-muted-foreground)]">
              {appConfig.tagline}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
                >
                  Get started
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="text-sm text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Built for
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-muted-foreground)]">
              <li>Finance teams</li>
              <li>Bookkeepers</li>
              <li>Month-end reconciliation</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted-foreground)]">
          © {new Date().getFullYear()} {appConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
