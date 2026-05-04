import Link from "next/link";
import { appConfig } from "@/lib/config";

interface LandingNavProps {
  accentColor?: string;
  mode?: "product" | "services";
}

export function LandingNav({ accentColor, mode = "product" }: LandingNavProps) {
  const accent = accentColor ?? "var(--color-accent)";
  const isServices = mode === "services";
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D7D1C7] bg-white/90 backdrop-blur-md">
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
          <Link href={isServices ? "#services" : "#features"} className="text-sm font-semibold text-[#475467] transition hover:text-[#111827]">
            {isServices ? "Services" : "Features"}
          </Link>
          <Link href="#pricing" className="text-sm font-semibold text-[#475467] transition hover:text-[#111827]">
            Pricing
          </Link>
          {isServices && (
            <Link href="#contact" className="text-sm font-semibold text-[#475467] transition hover:text-[#111827]">
              Contact
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={isServices ? "#contact" : "/sign-up"}
            className="inline-flex h-9 items-center rounded-xl px-5 text-sm font-bold !text-white transition hover:brightness-110"
            style={{ background: accent }}
          >
            {isServices ? "Contact me" : "Start free"}
          </Link>
        </div>
      </div>
    </header>
  );
}
