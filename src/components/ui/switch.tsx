import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

export function Switch({ className, checked, onCheckedChange, ...props }: SwitchProps) {
  return (
    <label className={cn("relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:outline-hidden", checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]", className)}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </label>
  );
}
