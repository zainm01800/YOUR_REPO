import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,31,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

