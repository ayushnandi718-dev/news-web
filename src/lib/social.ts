/**
 * Social destinations — override per environment without code changes:
 * NEXT_PUBLIC_SOCIAL_WHATSAPP, NEXT_PUBLIC_SOCIAL_FACEBOOK, NEXT_PUBLIC_SOCIAL_X,
 * NEXT_PUBLIC_SOCIAL_INSTAGRAM, NEXT_PUBLIC_SOCIAL_YOUTUBE
 */
const envOr = (key: string, fallback: string) => process.env[key] || fallback;

export interface SocialLink {
  key: "whatsapp" | "facebook" | "x" | "instagram" | "youtube";
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { key: "whatsapp", label: "WhatsApp", href: envOr("NEXT_PUBLIC_SOCIAL_WHATSAPP", "https://whatsapp.com/channel/duarserskhabar") },
  { key: "facebook", label: "Facebook", href: envOr("NEXT_PUBLIC_SOCIAL_FACEBOOK", "https://facebook.com/duarserskhabar") },
  { key: "x", label: "X (Twitter)", href: envOr("NEXT_PUBLIC_SOCIAL_X", "https://x.com/duarserskhabar") },
  { key: "instagram", label: "Instagram", href: envOr("NEXT_PUBLIC_SOCIAL_INSTAGRAM", "https://instagram.com/duarserskhabar") },
  { key: "youtube", label: "YouTube", href: envOr("NEXT_PUBLIC_SOCIAL_YOUTUBE", "https://youtube.com/@duarserskhabar") },
];
