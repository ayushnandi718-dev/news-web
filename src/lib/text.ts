export function slugify(text: string): string {
  return (
    text
      // Keep combining marks (\p{M}) so Bengali vowel signs/conjuncts survive.
      .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90)
  );
}

/** Safe slug lookup helper: URLs arrive percent-encoded. */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

const STOPWORDS = new Set([
  "a","an","the","and","or","but","of","in","on","at","to","for","with","by","from","as","is","are","was","were","be","been","it","its","this","that","these","those","over","after","before","into","about","am","pm",
]);

export function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ")
    .trim();
}

export function tokenize(text: string): Set<string> {
  return new Set(normalizeTitle(text).split(" ").filter(Boolean));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

export function diceBigram(a: string, b: string): number {
  const A = bigrams(normalizeTitle(a));
  const B = bigrams(normalizeTitle(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export function titleSimilarity(a: string, b: string): number {
  return Math.max(jaccard(tokenize(a), tokenize(b)), diceBigram(a, b));
}

export function textSimilarity(a: string, b: string): number {
  const A = tokenize(a.slice(0, 2000));
  const B = tokenize(b.slice(0, 2000));
  return jaccard(A, B);
}

export function hashId(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + input.length.toString(36);
}
