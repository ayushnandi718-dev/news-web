import { EventEmitter } from "events";

export type NewsEvent =
  | { type: "article.published"; id: string; slug: string; title: string; categoryId: string; publishedAt: string; isBreaking: boolean }
  | { type: "article.updated"; id: string; slug: string; title: string }
  | { type: "article.archived" }
  | { type: "breaking.updated" }
  | { type: "heartbeat" };

const globalForBus = globalThis as unknown as { newsBus?: EventEmitter };

export const bus = (globalForBus.newsBus ??= new EventEmitter().setMaxListeners(0));

export function publishEvent(event: NewsEvent): void {
  bus.emit("news", event);
}

export function subscribeNews(handler: (event: NewsEvent) => void): () => void {
  bus.on("news", handler);
  return () => bus.off("news", handler);
}
