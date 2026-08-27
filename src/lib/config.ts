export type FreshnessKey = "JUST_IN" | "FRESH" | "RECENT" | "TODAY" | "OLDER";

export interface FreshnessBand {
  key: FreshnessKey;
  label: string;
  maxMinutes: number;
}

export const FRESHNESS_THRESHOLDS: FreshnessBand[] = [
  { key: "JUST_IN", label: "Just In", maxMinutes: 30 },
  { key: "FRESH", label: "Fresh", maxMinutes: 180 },
  { key: "RECENT", label: "Recent", maxMinutes: 720 },
  { key: "TODAY", label: "Today", maxMinutes: 1440 },
  { key: "OLDER", label: "Older", maxMinutes: Number.POSITIVE_INFINITY },
];

export const CATEGORY_FRESHNESS_MULTIPLIERS: Record<string, number> = {
  breaking: 0.5,
  sports: 0.75,
  business: 1,
  india: 1,
  world: 1,
  technology: 1.25,
  entertainment: 1.5,
  lifestyle: 2,
};

export interface CategoryFreshnessOverride {
  multiplier?: number;
  bands?: Partial<Record<FreshnessKey, number>>;
}

export function freshnessBandsForCategory(
  categorySlug?: string | null,
  rawOverrides?: unknown
): FreshnessBand[] {
  let multiplier = (categorySlug && CATEGORY_FRESHNESS_MULTIPLIERS[categorySlug]) || 1;
  let explicit: Partial<Record<FreshnessKey, number>> | undefined;
  if (rawOverrides && typeof rawOverrides === "object") {
    const o = rawOverrides as CategoryFreshnessOverride;
    if (typeof o.multiplier === "number" && o.multiplier > 0) multiplier = o.multiplier;
    if (o.bands && typeof o.bands === "object") explicit = o.bands;
  }
  return FRESHNESS_THRESHOLDS.map((band) => ({
    ...band,
    maxMinutes:
      explicit && typeof explicit[band.key] === "number"
        ? (explicit[band.key] as number)
        : band.maxMinutes * multiplier,
  }));
}

export const ARTICLE_STATUSES = [
  "NEW",
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "OLDER",
  "ARCHIVED",
] as const;
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number];

// Reader-facing statuses. ARCHIVED is intentionally excluded:
// archived stories stay in admin dashboards but leave every public surface.
export const PUBLIC_VISIBLE_STATUSES: ArticleStatusValue[] = ["PUBLISHED", "OLDER"];

export const LATEST_WINDOW_HOURS = 72;

export const TRENDING_WINDOW_HOURS = 72;
export const TRENDING_WEIGHTS = { views: 12, shares: 8, comments: 6, recency: 40 };
export const TRENDING_HALF_LIFE_HOURS = 12;

export const FRESHNESS_SCORE_CONFIG = {
  halfLifeHours: 6,
  editorialMax: 10,
  engagementMax: 5,
  geographicMax: 8,
};

export const GEOGRAPHIC_PRIORITY_WEIGHTS = {
  LOCAL: 1.0,
  REGIONAL: 0.8,
  STATE: 0.6,
  NATIONAL: 0.4,
  INTERNATIONAL: 0.2,
};

export const CACHE_TTL_SECONDS = {
  latest: 15,
  breaking: 5,
  trending: 60,
  home: 20,
  categories: 300,
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const NEWSROOM_TZ = process.env.NEWSROOM_TZ || "Asia/Kolkata";
export const ARCHIVE_ROLLUP_TZ = NEWSROOM_TZ;

export const INGEST_DEFAULT_INTERVAL_MINUTES = 15;
export const INGEST_MAX_FAILURES_BEFORE_DISABLE = 10;
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.82;
export const INGEST_FETCH_TIMEOUT_MS = 10_000;
export const INGEST_RETRIES = 2;
export const INGEST_LOOKBACK_DAYS_FOR_DEDUPE = 7;

export const NEWSAPI_BASE = "https://newsapi.org/v2";
export function newsApiKey(): string {
  return process.env.NEWS_API_KEY || "";
}

export const SESSION_COOKIE = "newsroom_session";
export const SESSION_TTL_HOURS = 12;

export const BREAKING_MAX_HOURS = 8;

export const SESSION_REMEMBER_HOURS = 24 * 30;
export const PASSWORD_RESET_TTL_MINUTES = 30;
