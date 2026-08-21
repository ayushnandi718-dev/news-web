import { freshnessBandsForCategory, type FreshnessKey } from "./config";

export interface ClientFreshness {
  key: FreshnessKey;
  label: string;
  ageLabel: string;
}

export function computeFreshness(
  publishedAtIso: string | null,
  now: number,
  categorySlug?: string | null,
  overrides?: unknown
): ClientFreshness | null {
  if (!publishedAtIso) return null;
  const mins = Math.max(0, (now - new Date(publishedAtIso).getTime()) / 60_000);
  const bands = freshnessBandsForCategory(categorySlug, overrides);
  for (const b of bands) {
    if (mins <= b.maxMinutes) return { key: b.key, label: b.label, ageLabel: ageLabel(mins) };
  }
  return { key: "OLDER", label: "Older", ageLabel: ageLabel(mins) };
}

export function ageLabel(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  const hrs = minutes / 60;
  if (hrs < 24) return `${Math.floor(hrs)} hr ago`;
  const days = hrs / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function formatTime(iso: string | null, tz = process.env.NEWSROOM_TZ || "Asia/Kolkata"): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null, tz = process.env.NEWSROOM_TZ || "Asia/Kolkata"): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(iso));
}
