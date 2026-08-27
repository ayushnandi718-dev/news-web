import * as cheerio from "cheerio";

export interface ExtractResult {
  ok: boolean;
  text?: string;
  leadImage?: string;
  error?: string;
}

const BLOCK = "script,style,noscript,nav,header,footer,aside,form,iframe,svg,button,label,select,figcaption";

/**
 * Fetches the original article page and heuristically extracts the main text.
 * Strategy: score candidate containers by <p> text volume, then join their
 * paragraphs. Falls back to the densest <p> cluster in <body>.
 */
export async function extractArticleText(
  url: string,
  timeoutMs = 8000
): Promise<ExtractResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    html = await res.text();
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error" };
  }

  try {
    const $ = cheerio.load(html);
    $(BLOCK).remove();

    // candidate containers ranked by paragraph volume
    const candidates = new Map<cheerio.Cheerio<never>, number>();
    const scoreOf = ($el: never) => {
      let score = 0;
      $($el)
        .find("p")
        .each((_, p) => {
          const len = ($(p).text() || "").trim().length;
          if (len > 40) score += len;
        });
      return score;
    };
    $("article, [itemprop='articleBody'], .article-body, .story-body, .post-content, .entry-content, main").each((_, el) => {
      const s = scoreOf(el as never);
      if (s > 300) candidates.set($(el as never) as never, s);
    });

    let best: { $el: cheerio.Cheerio<never>; score: number } | null = null;
    for (const [$el, score] of candidates) {
      if (!best || score > best.score) best = { $el, score };
    }

    let paragraphs: string[] = [];
    if (best) {
      best.$el.find("p").each((_, p) => {
        const t = ($(p).text() || "").replace(/\s+/g, " ").trim();
        if (t.length > 40) paragraphs.push(t);
      });
    }
    if (paragraphs.join(" ").length < 400) {
      // fallback: densest run of <p>s anywhere
      paragraphs = [];
      $("p").each((_, p) => {
        const t = ($(p).text() || "").replace(/\s+/g, " ").trim();
        if (t.length > 60) paragraphs.push(t);
      });
    }

    const text = paragraphs.join("\n\n").trim();
    if (text.length < 400) return { ok: false, error: "insufficient_text" };

    // lead image from og meta or first content img
    let leadImage: string | undefined =
      $('meta[property="og:image"]').attr("content") || $("img").first().attr("src") || undefined;
    if (leadImage?.startsWith("//")) leadImage = "https:" + leadImage;

    return { ok: true, text: text.slice(0, 20000), leadImage };
  } catch {
    return { ok: false, error: "parse_error" };
  }
}
