// Global test setup — runs before every test file
import { vi } from "vitest";

// Mock Prisma client so tests never touch a real database
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_, model: string) {
        // Return a chainable mock for any Prisma model call
        const chain: Record<string, unknown> = {};
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_, method: string | symbol) {
            if (method === Symbol.toPrimitive) return () => "";
            if (method === "then") return undefined; // prevent await issues
            if (typeof method !== "string") return undefined;
            // Return a function that resolves to a sensible default
            return (...args: unknown[]) => {
              // For findFirst/findUnique/findMany → null/[]
              if (method === "findFirst" || method === "findUnique") return Promise.resolve(null);
              if (method === "findMany") return Promise.resolve([]);
              if (method === "count") return Promise.resolve(0);
              if (method === "create") return Promise.resolve({ id: "test-id", ...((args[0] as Record<string, unknown>)?.data ?? {}) });
              if (method === "update") return Promise.resolve({ id: "test-id" });
              if (method === "updateMany") return Promise.resolve({ count: 0 });
              if (method === "delete") return Promise.resolve({ id: "test-id" });
              if (method === "deleteMany") return Promise.resolve({ count: 0 });
              if (method === "upsert") return Promise.resolve({ id: "test-id" });
              if (method === "createMany") return Promise.resolve({ count: 0 });
              if (method === "aggregate") return Promise.resolve({ _sum: {}, _avg: {}, _count: 0 });
              if (method === "groupBy") return Promise.resolve([]);
              if (method === "$transaction") {
                // Support both array and callback forms
                const first = args[0];
                if (Array.isArray(first)) return Promise.all(first);
                if (typeof first === "function") return first(new Proxy({}, handler));
                return Promise.resolve([]);
              }
              if (method === "$queryRaw") return Promise.resolve([]);
              if (method === "$executeRaw") return Promise.resolve(0);
              return Promise.resolve(null);
            };
          },
        };
        return new Proxy(chain, handler);
      },
    }
  ),
}));

// Mock the session secret key
vi.mock("@/lib/session-secret", () => ({
  sessionSecretKey: () => new TextEncoder().encode("test-secret-key-for-testing-only-32ch"),
}));

// Mock cache module to be a no-op
vi.mock("@/lib/cache", () => ({
  cacheGet: () => undefined,
  cacheSet: () => {},
  cacheWrap: (_key: string, _ttl: number, _tags: string[], producer: () => Promise<unknown>) => producer(),
  invalidateTag: () => 0,
  invalidateTags: () => {},
}));

// Mock events module
vi.mock("@/lib/events", () => ({
  publishEvent: () => {},
  subscribeEvents: () => new AbortController(),
}));

// Mock audit module
vi.mock("@/lib/audit", () => ({
  audit: () => Promise.resolve(),
}));

// Suppress console output in tests
const noop = () => {};
vi.stubGlobal("console", {
  log: noop,
  warn: noop,
  error: noop,
  info: noop,
  debug: noop,
});
