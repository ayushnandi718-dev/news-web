export const AD_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "PAID",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "REJECTED",
] as const;

export const AD_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ড্রাফট",
  PENDING_REVIEW: "রিভিউতে আছে",
  PENDING_PAYMENT: "পেমেন্ট বাকি",
  PAID: "পেমেন্ট হয়েছে",
  APPROVED: "অনুমোদিত",
  ACTIVE: "চলছে",
  PAUSED: "থামানো",
  EXPIRED: "মেয়াদ শেষ",
  REJECTED: "প্রত্যাখ্যাত",
};

export const AD_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  PENDING_PAYMENT: "bg-orange-100 text-orange-700",
  PAID: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-sky-100 text-sky-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  EXPIRED: "bg-slate-200 text-slate-500",
  REJECTED: "bg-red-100 text-red-700",
};

/** Rendering slots on the public website (OTHER = offsite: ticker/social/article fulfilment). */
export const AD_PLACEMENTS = ["HOME_TOP", "HOME_SIDEBAR", "CATEGORY_TOP", "OTHER"] as const;

export const AD_PLACEMENT_LABELS: Record<string, string> = {
  HOME_TOP: "হোমপেজ টপ ব্যানার",
  HOME_SIDEBAR: "হোমপেজ সাইডবার",
  CATEGORY_TOP: "বিভাগ পেজ টপ",
  OTHER: "অফসাইট (টিকার/সোশ্যাল/সংবাদ)",
};

/**
 * Ad types — mirror the six options on the public /advertise page,
 * so what readers see as choices is exactly what the admin manages.
 */
export const AD_TYPES = [
  "HOME_BANNER",
  "CATEGORY_BANNER",
  "SPONSORED_NEWS",
  "BREAKING_TICKER",
  "LIVE_STREAM_SPONSORSHIP",
  "SOCIAL_MEDIA_PROMOTION",
] as const;

export const AD_TYPE_LABELS: Record<string, string> = {
  HOME_BANNER: "হোমপেজ ব্যানার",
  CATEGORY_BANNER: "বিভাগ পেজ ব্যানার",
  SPONSORED_NEWS: "স্পনসর্ড সংবাদ",
  BREAKING_TICKER: "ব্রেকিং টিকার",
  LIVE_STREAM_SPONSORSHIP: "লাইভ স্ট্রিম স্পনসরশিপ",
  SOCIAL_MEDIA_PROMOTION: "সোশ্যাল মিডিয়া প্রমোশন",
};

export const AD_SIZES = ["SMALL", "MEDIUM", "LARGE", "FULL_WIDTH"] as const;

export const AD_SIZE_LABELS: Record<string, string> = {
  SMALL: "ছোট (300×80)",
  MEDIUM: "মাঝারি (970×90)",
  LARGE: "বড় (970×250)",
  FULL_WIDTH: "ফুল প্রস্থ",
};

export interface PricingRow {
  type: string;
  placement: string;
  size: string;
  basePrice: number;
  active: boolean;
}

export const DEFAULT_RATES: PricingRow[] = [
  { type: "HOME_BANNER", placement: "HOME_TOP", size: "MEDIUM", basePrice: 500, active: true },
  { type: "HOME_BANNER", placement: "HOME_TOP", size: "FULL_WIDTH", basePrice: 800, active: true },
  { type: "HOME_BANNER", placement: "HOME_SIDEBAR", size: "SMALL", basePrice: 200, active: true },
  { type: "HOME_BANNER", placement: "HOME_SIDEBAR", size: "MEDIUM", basePrice: 350, active: true },
  { type: "CATEGORY_BANNER", placement: "CATEGORY_TOP", size: "MEDIUM", basePrice: 300, active: true },
  { type: "CATEGORY_BANNER", placement: "CATEGORY_TOP", size: "FULL_WIDTH", basePrice: 450, active: true },
  { type: "SPONSORED_NEWS", placement: "OTHER", size: "MEDIUM", basePrice: 600, active: true },
  { type: "BREAKING_TICKER", placement: "OTHER", size: "SMALL", basePrice: 250, active: true },
  { type: "LIVE_STREAM_SPONSORSHIP", placement: "OTHER", size: "LARGE", basePrice: 700, active: true },
  { type: "SOCIAL_MEDIA_PROMOTION", placement: "OTHER", size: "SMALL", basePrice: 300, active: true },
];

/** Duration multiplier: price scales with campaign length (days). */
export function estimatePrice(
  rows: PricingRow[],
  type: string,
  placement: string,
  size: string,
  days: number,
): number | null {
  const row = rows.find((r) => r.active && r.type === type && r.placement === placement && r.size === size);
  if (!row) return null;
  const multiplier = Math.max(1, Math.min(30, Math.ceil(days || 1)));
  return Math.round(row.basePrice * multiplier);
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
