interface Entry {
  value: unknown;
  expiresAt: number;
  tags: string[];
}

const globalForCache = globalThis as unknown as {
  newsCache?: Map<string, Entry>;
  newsCacheInflight?: Map<string, Promise<unknown>>;
};

const store = (globalForCache.newsCache ??= new Map());
const inflight = (globalForCache.newsCacheInflight ??= new Map());

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000, tags });
}

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  tags: string[],
  producer: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const p = producer()
    .then((value) => {
      cacheSet(key, value, ttlSeconds, tags);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function invalidateTag(tag: string): number {
  let n = 0;
  for (const [k, v] of store) {
    if (v.tags.includes(tag)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

export function invalidateTags(tags: string[]): void {
  for (const t of tags) invalidateTag(t);
}
