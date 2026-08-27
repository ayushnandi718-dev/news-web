import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    pushSubscription: {
      upsert: vi.fn().mockResolvedValue({ id: "sub-1", endpoint: "https://push.example.com" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

describe("push utilities", () => {
  it("subscribePush upserts a subscription", async () => {
    const { subscribePush } = await import("@/lib/push");
    const result = await subscribePush("https://push.example.com", "p256dh-key", "auth-key", ["breaking"]);
    expect(result.id).toBe("sub-1");
  }, 15000);

  it("unsubscribePush deletes by endpoint", async () => {
    const { unsubscribePush } = await import("@/lib/push");
    const { db } = await import("@/lib/db");
    await unsubscribePush("https://push.example.com");
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint: "https://push.example.com" } });
  }, 15000);

  it("getSubscriptionCount returns count", async () => {
    const { getSubscriptionCount } = await import("@/lib/push");
    const count = await getSubscriptionCount();
    expect(count).toBe(0);
  }, 15000);

  it("sendPushNotification returns 0/0 when VAPID not configured", async () => {
    const { sendPushNotification } = await import("@/lib/push");
    const result = await sendPushNotification({ title: "test", body: "body" });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  }, 15000);

  it("getVapidPublicKey returns null when not configured", async () => {
    const { getVapidPublicKey } = await import("@/lib/push");
    const key = await getVapidPublicKey();
    expect(key).toBeNull();
  }, 15000);
});
