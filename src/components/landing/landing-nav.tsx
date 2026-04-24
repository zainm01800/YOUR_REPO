import Link from "next/link";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-[var(--color-foreground)]">
            {appConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm font-medium text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-sm">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button className="text-sm">
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
