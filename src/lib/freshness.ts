import {
  freshnessBandsForCategory,
  FRESHNESS_SCORE_CONFIG,
  GEOGRAPHIC_PRIORITY_WEIGHTS,
  type FreshnessKey,
} from "./config";

export interface FreshnessInfo {
  key: FreshnessKey;
  label: string;
  ageMinutes: number;
  ageLabel: string;
}

export function ageMinutes(publishedAt: Date | string | null | undefined, now: Date): number {
  if (!publishedAt) return Number.POSITIVE_INFINITY;
  const t = typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  return Math.max(0, (now.getTime() - t.getTime()) / 60_000);
}

export function formatAgeLabel(minutes: number): string {
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)} hr ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function classifyFreshness(
  publishedAt: Date | string | null,
  now: Date = new Date(),
  categorySlug?: string | null,
  categoryOverrides?: unknown
): FreshnessInfo {
  const mins = ageMinutes(publishedAt, now);
  const bands = freshnessBandsForCategory(categorySlug, categoryOverrides);
  for (const band of bands) {
    if (mins <= band.maxMinutes) {
      return { key: band.key, label: band.label, ageMinutes: mins, ageLabel: formatAgeLabel(mins) };
    }
  }
  return {
    key: "OLDER",
    label: "Older",
    ageMinutes: mins,
    ageLabel: formatAgeLabel(mins),
  };
}

export function isBreakingActive(
  isBreaking: boolean,
  breakingUntil: Date | string | null,
  now: Date = new Date()
): boolean {
  if (!isBreaking || !breakingUntil) return false;
  const until = typeof breakingUntil === "string" ? new Date(breakingUntil) : breakingUntil;
  return until.getTime() > now.getTime();
}

export function recencyScore(ageHrs: number, halfLifeHours: number): number {
  return 100 * Math.exp((-Math.LN2 * ageHrs) / halfLifeHours);
}

function logScale(n: number): number {
  return Math.log1p(Math.max(0, n));
}

export interface ScoreInput {
  publishedAt?: Date | string | null;
  editorialPriority?: number;
  geographicPriority?: number;
  geographicScope?: string;
  isFeatured?: boolean;
  views?: number;
  shares?: number;
  commentsCount?: number;
}

export function freshnessScore(a: ScoreInput, now: Date = new Date()): number {
  const hrs = ageMinutes(a.publishedAt, now) / 60;
  if (!Number.isFinite(hrs)) return 0;
  const recency = recencyScore(hrs, FRESHNESS_SCORE_CONFIG.halfLifeHours);
  const editorial = Math.min(
    FRESHNESS_SCORE_CONFIG.editorialMax,
    (a.editorialPriority ?? 0) * 3 + (a.isFeatured ? 4 : 0)
  );
  const geographic = Math.min(
    FRESHNESS_SCORE_CONFIG.geographicMax,
    (a.geographicPriority ?? 0) * 2.5 + (GEOGRAPHIC_PRIORITY_WEIGHTS[a.geographicScope as keyof typeof GEOGRAPHIC_PRIORITY_WEIGHTS] || 0.5) * 3
  );
  const engagement = Math.min(
    FRESHNESS_SCORE_CONFIG.engagementMax,
    0.6 * logScale(a.views ?? 0) + 0.8 * logScale(a.shares ?? 0) + 0.8 * logScale(a.commentsCount ?? 0)
  );
  return recency + editorial + geographic + engagement;
}

export function trendingScore(a: ScoreInput, now: Date = new Date(), weights = {
  views: 12,
  shares: 8,
  comments: 6,
  recency: 40,
}, halfLifeHours = 12): number {
  const hrs = ageMinutes(a.publishedAt, now) / 60;
  if (!Number.isFinite(hrs)) return 0;
  return (
    weights.views * logScale(a.views ?? 0) +
    weights.shares * logScale(a.shares ?? 0) +
    weights.comments * logScale(a.commentsCount ?? 0) +
    weights.recency * recencyScore(hrs, halfLifeHours) / 100
  );
}


