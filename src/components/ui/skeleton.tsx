import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[var(--color-panel)]", className)}
      style={style}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${80 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[var(--color-panel)] px-6 py-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${Math.max(120 - i * 10, 40)}px` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-[var(--color-border)] px-6 py-5">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4" style={{ width: `${Math.max(100 - j * 8, 30)}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
