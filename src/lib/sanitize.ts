const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u",
  "h3", "h4",
  "ul", "ol", "li",
  "a",
]);

function safeHref(rawAttrs: string): string | null {
  const m = rawAttrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(href) ? href.replace(/"/g, "&quot;") : null;
}

/**
 * Allowlist-based HTML sanitizer for admin-written ad descriptions.
 * Strips every tag not in ALLOWED_TAGS, removes all attributes except a
 * validated http(s)/mailto href on <a>, drops script/style blocks entirely,
 * and escapes any leftover angle brackets as plain text.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return "";
  let html = input.slice(0, 20_000);

  // Dangerous blocks go away with their content.
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  html = html.replace(/<\s*\/?\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>/gi, "");

  // One pass over every remaining tag.
  html = html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, close: string, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return `</${tag}>`;
    if (tag === "br") return "<br />";
    if (tag === "a") {
      const href = safeHref(rawAttrs);
      return href
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
        : "<a>";
    }
    return `<${tag}>`;
  });

  // Whatever angle brackets survived are literal text — escape them.
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return html.trim();
}
