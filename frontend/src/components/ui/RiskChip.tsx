import type { RiskLevel } from "../../types/api";
import { RISK_LABELS } from "../../lib/format";
import { cn } from "../../lib/cn";

const styles: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  moderate: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
  heavy: "bg-risk-heavy/15 text-risk-heavy ring-risk-heavy/30",
  extreme: "bg-risk-extreme/15 text-risk-extreme ring-risk-extreme/30",
};

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1",
        styles[level],
      )}
    >
      <span aria-hidden className="font-mono">
        {level === "low" ? "·" : level === "moderate" ? "··" : level === "heavy" ? "···" : "····"}
      </span>
      {RISK_LABELS[level]}
    </span>
  );
}
