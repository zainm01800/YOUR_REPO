import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-border-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]",
        props.className,
      )}
    />
  );
}

