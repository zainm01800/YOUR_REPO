import type { MatchStatus, RunStatus } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";

export function RunStatusPill({ status }: { status: RunStatus }) {
  const tone =
    status === "exported" || status === "completed"
      ? "success"
      : status === "review_required"
        ? "warning"
        : status === "failed"
          ? "danger"
          : "neutral";

  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}

export function MatchStatusPill({ status }: { status: MatchStatus }) {
  const tone =
    status === "matched"
      ? "success"
      : status === "probable_match" || status === "multiple_candidates"
        ? "warning"
        : status === "duplicate_suspected"
          ? "danger"
          : "neutral";

  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}

