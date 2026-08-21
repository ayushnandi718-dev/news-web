import { XMLParser } from "fast-xml-parser";
import { hashId } from "../text";

export interface NormalizedItem {
  externalId: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  summary?: string;
  contentText?: string;
  imageUrl?: string;
  sourcePublishedAt?: Date;
}

export interface FetchResult {
  status: "OK" | "NOT_MODIFIED" | "ERROR";
  body?: string;
  etag?: string;
  lastModified?: string;
  error?: string;
  retryAfterSeconds?: number;
}

export async function fetchSource(
  url: string,
  cond: { etag?: string | null; lastModified?: string | null },
  timeoutMs: number,
  retries: number
): Promise<FetchResult> {
  let attempt = 0;
  let lastError = "unknown";
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { "user-agent": "NewsWebBot/1.0 (+newsroom ingest)" };
      if (cond.etag) headers["if-none-match"] = cond.etag;
      if (cond.lastModified) headers["if-modified-since"] = cond.lastModified;
      const res = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
      clearTimeout(timer);
      if (res.status === 304) {
        return { status: "NOT_MODIFIED", etag: res.headers.get("etag") ?? undefined, lastModified: res.headers.get("last-modified") ?? undefined };
      }
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("retry-after") ?? "60", 10);
        return { status: "ERROR", error: "rate_limited", retryAfterSeconds: isNaN(ra) ? 60 : ra };
      }
      if (!res.ok) {
        lastError = `http_${res.status}`;
      } else {
        return {
          status: "OK",
          body: await res.text(),
          etag: res.headers.get("etag") ?? undefined,
          lastModified: res.headers.get("last-modified") ?? undefined,
        };
      }
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : "network_error";
    }
    attempt++;
    if (attempt <= retries) await new Promise((r) => setTimeout(r, 1000 * attempt * attempt));
  }
  return { status: "ERROR", error: lastError };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function asArray<T>(x: unknown): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? (x as T[]) : [x as T];
}

function textOf(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    if ("#text" in o) return String(o["#text"]);
    if ("@_href" in o) return String(o["@_href"]);
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findImage(entry: Record<string, unknown>): string | undefined {
  const enc = asArray<Record<string, unknown>>(entry.enclosure).find((e) =>
    String(e["@_type"] ?? "").startsWith("image")
  );
  if (enc?.["@_url"]) return String(enc["@_url"]);
  const media = entry["media:thumbnail"] ?? entry["media:content"];
  const m = asArray<Record<string, unknown>>(media)[0];
  if (m?.["@_url"]) return String(m["@_url"]);
  const html = textOf(entry["content:encoded"]) || textOf(entry.description) || textOf(entry.summary);
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img) return img[1];
  return undefined;
}

export function parseFeed(xml: string): NormalizedItem[] {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }
  const rssChannel = ((doc.rss as Record<string, unknown>)?.channel as Record<string, unknown>) ?? undefined;
  const rdfItems = asArray<Record<string, unknown>>((doc["rdf:RDF"] as Record<string, unknown>)?.item);
  const items = [
    ...asArray<Record<string, unknown>>(rssChannel?.item),
    ...rdfItems,
    ...asArray<Record<string, unknown>>(((doc.feed as Record<string, unknown>) ?? {})?.entry),
  ];
  const out: NormalizedItem[] = [];
  for (const item of items) {
    const link =
      textOf(item.link) ||
      (typeof item.link === "object" && item.link !== null && !Array.isArray(item.link)
        ? String((item.link as Record<string, unknown>)["@_href"] ?? "")
        : "") ||
      textOf(item.guid) ||
      "";
    const title = stripHtml(textOf(item.title));
    if (!link || !title) continue;
    const contentRaw = textOf(item["content:encoded"]) || textOf(item.content) || textOf(item.description) || textOf(item.summary);
    const dateStr =
      textOf(item.pubDate) || textOf(item.published) || textOf(item.updated) || textOf(item["dc:date"]);
    let publishedAt: Date | undefined;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) publishedAt = d;
    }
    out.push({
      externalId: textOf(item.guid) || textOf(item.id) || hashId(link),
      title,
      url: link,
      canonicalUrl: link,
      summary: stripHtml(textOf(item.description) || textOf(item.summary)).slice(0, 500),
      contentText: stripHtml(contentRaw).slice(0, 8000),
      imageUrl: findImage(item),
      sourcePublishedAt: publishedAt,
    });
  }
  return out;
}
