import { db } from "@/lib/db";
import { BRAND } from "@/lib/brand";
import { SOCIAL_LINKS } from "@/lib/social";

export interface SiteSettings {
  // Branding
  siteNameBn: string;
  siteNameEn: string;
  tagline: string;
  logoUrl: string;
  // Contact
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  // Social media
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  xUrl: string;
}

const DEFAULTS: SiteSettings = {
  siteNameBn: BRAND.bn,
  siteNameEn: BRAND.en,
  tagline: BRAND.tagline,
  logoUrl: "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "newsroom@duarserskhabar.in",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  contactWhatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  contactAddress: "আলিপুরদুয়ার, আলিপুরদুয়ার জেলা, পশ্চিমবঙ্গ",
  facebookUrl: SOCIAL_LINKS.find((s) => s.key === "facebook")?.href ?? "",
  instagramUrl: SOCIAL_LINKS.find((s) => s.key === "instagram")?.href ?? "",
  youtubeUrl: SOCIAL_LINKS.find((s) => s.key === "youtube")?.href ?? "",
  xUrl: SOCIAL_LINKS.find((s) => s.key === "x")?.href ?? "",
};

export const SITE_SETTING_KEYS = Object.keys(DEFAULTS) as (keyof SiteSettings)[];

/** Fields where an empty value makes no sense — they silently fall back to defaults. */
const FALLBACK_WHEN_EMPTY: ReadonlySet<string> = new Set(["siteNameBn", "contactEmail"]);

/**
 * Site-wide editable settings stored in the DB (SiteSetting key/value),
 * falling back to brand/env defaults only for keys never saved before.
 * An explicitly saved empty string means "hide/clear" for optional fields.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: [...SITE_SETTING_KEYS] } },
    });
    const saved = new Map(rows.map((r) => [r.key, r.value]));
    return Object.fromEntries(
      SITE_SETTING_KEYS.map((k) => {
        if (!saved.has(k)) return [k, DEFAULTS[k]];
        const value = saved.get(k)?.trim() ?? "";
        return [k, value === "" && FALLBACK_WHEN_EMPTY.has(k) ? DEFAULTS[k] : value];
      }),
    ) as unknown as SiteSettings;
  } catch {
    return { ...DEFAULTS };
  }
}

/** Convenience wrapper for pages that only need contact info. */
export async function getContactSettings() {
  const s = await getSiteSettings();
  return {
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    contactWhatsapp: s.contactWhatsapp,
    contactAddress: s.contactAddress,
  };
}

/** Social links array shaped like lib/social SOCIAL_LINKS, from settings. */
export function socialLinksFrom(s: SiteSettings) {
  return [
    { key: "whatsapp" as const, label: "WhatsApp", href: s.contactWhatsapp ? `https://wa.me/${s.contactWhatsapp.replace(/[^\d]/g, "")}` : SOCIAL_LINKS[0].href },
    { key: "facebook" as const, label: "Facebook", href: s.facebookUrl },
    { key: "x" as const, label: "X (Twitter)", href: s.xUrl },
    { key: "instagram" as const, label: "Instagram", href: s.instagramUrl },
    { key: "youtube" as const, label: "YouTube", href: s.youtubeUrl },
  ].filter((l) => Boolean(l.href));
}
