import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "card-premium",
        className,
      )}
    >
      {children}
    </div>
  );
}

