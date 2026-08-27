/** Live stream helpers: platform detection + best-effort og:image/og:title fetch. */

export type LivePlatform = "FACEBOOK" | "YOUTUBE" | "OTHER";

export function detectPlatform(url: string): LivePlatform {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "OTHER";
  }
  if (host.endsWith("facebook.com") || host === "fb.watch" || host === "fb.me" || host.endsWith("m.facebook.com")) {
    return "FACEBOOK";
  }
  if (host.endsWith("youtube.com") || host === "youtu.be") {
    return "YOUTUBE";
  }
  return "OTHER";
}

export interface LinkMeta {
  title?: string;
  bannerUrl?: string;
}

/**
 * Best-effort OpenGraph metadata fetch for a pasted live link.
 * Never throws — returns {} on any failure (bot-blocked pages, timeouts…).
 */
export async function fetchLinkMeta(url: string, timeoutMs = 8000): Promise<LinkMeta> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "bn,en;q=0.8",
      },
    });
    if (!res.ok) return {};
    const html = (await res.text()).slice(0, 400_000);
    const meta = (prop: string): string | undefined => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return decodeEntities(m[1]);
      }
      return undefined;
    };
    const title = meta("og:title") ?? meta("twitter:title");
    const bannerUrl = meta("og:image") ?? meta("twitter:image");
    return { title: title?.slice(0, 200), bannerUrl: bannerUrl?.slice(0, 4000) };
  } catch {
    return {};
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export const PLATFORM_LABELS: Record<LivePlatform, string> = {
  FACEBOOK: "Facebook Live",
  YOUTUBE: "YouTube Live",
  OTHER: "Live",
};

/** Extracts a YouTube video id from any common URL shape; null otherwise. */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(shorts|embed|live|v)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/** Deterministic YouTube thumbnail (no network needed). */
export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}
