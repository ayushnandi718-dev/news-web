/**
 * Single source of truth for site identity.
 * Rename the brand WITHOUT code changes via .env:
 *   NEXT_PUBLIC_SITE_NAME_BN, NEXT_PUBLIC_SITE_NAME_EN, NEXT_PUBLIC_SITE_TAGLINE, NEXT_PUBLIC_SITE_TWITTER
 * (NEXT_PUBLIC_* values are inlined at build time — set them before `next build`.)
 */
export const BRAND = {
  bn: process.env.NEXT_PUBLIC_SITE_NAME_BN || "ডুয়ার্সের খবর",
  en: process.env.NEXT_PUBLIC_SITE_NAME_EN || "DOOARSER KHABAR",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "আপনার এলাকার খবর, আপনার ভাষায়।",
  twitter: process.env.NEXT_PUBLIC_SITE_TWITTER || "@duarserskhabar",
} as const;

/** Canonical origin of the deployed site (no trailing slash). */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Default share card (dynamic, always on-brand). Per-article cards: /api/og?title=... */
export function ogImageUrl(params?: { title?: string; subtitle?: string }): string {
  const base = `${siteUrl()}/api/og`;
  if (!params?.title && !params?.subtitle) return base;
  const q = new URLSearchParams();
  if (params.title) q.set("title", params.title);
  if (params.subtitle) q.set("subtitle", params.subtitle);
  return `${base}?${q.toString()}`;
}

/** Publisher logo served as a real image URL (used in JSON-LD). */
export function brandLogoUrl(): string {
  return `${siteUrl()}/api/og?square=1`;
}

/** Bengali display labels for known category/region slugs (presentation only). */
const BN_LABELS: Record<string, string> = {
  alipurduar: "আলিপুরদুয়ার",
  dooars: "ডুয়ার্স",
  "north-bengal": "উত্তরবঙ্গ",
  "west-bengal": "রাজ্য",
  india: "দেশ",
  world: "বিশ্ব",
  politics: "রাজনীতি",
  business: "ব্যবসা",
  sports: "খেলা",
  entertainment: "বিনোদন",
  technology: "প্রযুক্তি",
  lifestyle: "লাইফস্টাইল",
  special: "বিশেষ প্রতিবেদন",
  breaking: "ব্রেকিং",
  education: "শিক্ষা",
  health: "স্বাস্থ্য",
  science: "বিজ্ঞান",
  data: "ডেটা",
  cricket: "ক্রিকেট",
  football: "ফুটবল",
  obituary: "শোক সংবাদ",
  tip: "সংবাদ টিপ",
  gallery: "ফটো গ্যালারি",
  polls: "পোল ও সার্ভে",
};

export function bnLabel(slug: string | null | undefined, fallback?: string): string {
  if (!slug) return fallback ?? "";
  return BN_LABELS[slug] ?? fallback ?? slug;
}

/** Homepage section order: Alipurduar → Dooars → North Bengal → State → Country → World → ... */
export const HOME_SECTION_SLUGS = [
  "alipurduar",
  "dooars",
  "north-bengal",
  "west-bengal",
  "india",
  "world",
  "politics",
  "sports",
  "entertainment",
  "business",
  "technology",
  "lifestyle",
  "special",
] as const;

export const PRIMARY_NAV: Array<{ href: string; label: string }> = [
  { href: "/", label: "হোম" },
  { href: "/news", label: "সর্বশেষ" },
  { href: "/category/alipurduar", label: "আলিপুরদুয়ার" },
  { href: "/category/dooars", label: "ডুয়ার্স" },
  { href: "/category/north-bengal", label: "উত্তরবঙ্গ" },
  { href: "/category/west-bengal", label: "রাজ্য" },
  { href: "/category/india", label: "দেশ" },
  { href: "/category/world", label: "বিশ্ব" },
  { href: "/category/politics", label: "রাজনীতি" },
  { href: "/category/business", label: "ব্যবসা" },
  { href: "/category/sports", label: "খেলা" },
  { href: "/category/entertainment", label: "বিনোদন" },
  { href: "/category/technology", label: "প্রযুক্তি" },
  { href: "/category/lifestyle", label: "লাইফস্টাইল" },
  { href: "/live", label: "লাইভ" },
];

/** One navigation model reused by the desktop strip, mobile drawer and footer. */
export const NAV_MAIN = PRIMARY_NAV.slice(0, 8);

export const NAV_CATEGORIES: Array<{ href: string; label: string; accent?: boolean }> = [
  ...PRIMARY_NAV.slice(8),
];

export const NAV_OTHER: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "নিউজরুম" },
  { href: "/weather", label: "আবহাওয়া" },
  { href: "/market", label: "মার্কেট আপডেট" },
  { href: "/trending", label: "ট্রেন্ডিং" },
  { href: "/gallery", label: "ফটো গ্যালারি" },
  { href: "/polls", label: "পোল ও সার্ভে" },
  { href: "/advertisements", label: "বিজ্ঞাপনসমূহ" },
  { href: "/obituary", label: "শোক সংবাদ" },
  { href: "/tip", label: "সংবাদ টিপ" },
  { href: "/advertise", label: "বিজ্ঞাপন দিন" },
  { href: "/contact", label: "যোগাযোগ" },
  { href: "/about", label: "আমাদের সম্পর্কে" },
];

export const NAV_LEGAL: Array<{ href: string; label: string }> = [
  { href: "/privacy", label: "গোপনীয়তা নীতি" },
  { href: "/terms", label: "ব্যবহারের শর্ত" },
  { href: "/corrections", label: "সংশোধনী নীতি" },
  { href: "/cookies", label: "কুকি নীতি" },
];

export function bengaliToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("bn-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: process.env.NEWSROOM_TZ || "Asia/Kolkata",
  }).format(now);
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bnNum(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Bengali relative age, e.g. "৫ মিনিট আগে" — mirrors lib/format ageLabel for the public site. */
export function ageLabelBn(minutes: number): string {
  if (minutes < 1) return "এইমাত্র";
  if (minutes < 60) return `${bnNum(Math.floor(minutes))} মিনিট আগে`;
  const hrs = minutes / 60;
  if (hrs < 24) return `${bnNum(Math.floor(hrs))} ঘণ্টা আগে`;
  const days = hrs / 24;
  if (days < 7) return `${bnNum(Math.floor(days))} দিন আগে`;
  return `${bnNum(Math.floor(days / 7))} সপ্তাহ আগে`;
}

export function formatClockBn(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("bn-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: process.env.NEWSROOM_TZ || "Asia/Kolkata",
  }).format(new Date(iso));
}

/** Bengali labels for freshness keys (public badges). */
export const FRESHNESS_BN: Record<string, string> = {
  JUST_IN: "এইমাত্র",
  FRESH: "নতুন",
  RECENT: "সাম্প্রতিক",
  TODAY: "আজকের",
  OLDER: "পুরোনো",
};
