import Link from "next/link";
import { appConfig } from "@/lib/config";

interface LandingNavProps {
  accentColor?: string;
}

export function LandingNav({ accentColor }: LandingNavProps) {
  const accent = accentColor ?? "var(--color-accent)";
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: accent }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-[#111827]">
            {appConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm font-medium text-gray-500 transition hover:text-gray-900">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-gray-500 transition hover:text-gray-900">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: accent }}
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
