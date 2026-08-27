declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys?: { p256dh: string; auth: string };
  }

  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  function setVapidDetails(email: string, publicKey: string, privateKey: string): void;
  function sendNotification(
    subscription: PushSubscription,
    payload: string,
    options?: { TTL?: number; urgency?: string; topic?: string }
  ): Promise<SendResult>;
}
