import type { RiskLevel } from "../types/api";

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  heavy: "Heavy",
  extreme: "Extreme",
};

export function formatCoordinate(value: number, digits = 4): string {
  return value.toFixed(digits);
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatNumber(value: number | null | undefined, digits = 1, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const text = value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}
