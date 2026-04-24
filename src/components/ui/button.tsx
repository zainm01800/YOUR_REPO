import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-accent-strong)]",
  secondary:
    "border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-panel)]",
  ghost: "text-[var(--color-muted-foreground)] hover:bg-[var(--color-panel)]",
  danger:
    "border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]/80",
};

export function Button({
  className,
  children,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[9px] px-4 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
