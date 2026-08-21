"use client";

import { useEffect, useRef, useState } from "react";

export interface LivePublishedEvent {
  type: "article.published";
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  publishedAt: string;
  isBreaking: boolean;
}

export interface BreakingEvent {
  type: "breaking.updated";
}

export type NewsSocketEvent = LivePublishedEvent | BreakingEvent | { type: "heartbeat" };

export function useNewsEvents(onEvent?: (e: NewsSocketEvent) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      es = new EventSource("/api/v1/events");
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed) retry = setTimeout(connect, 3000);
      };
      const types = ["article.published", "breaking.updated"];
      for (const t of types) {
        es.addEventListener(t, (ev) => {
          try {
            handlerRef.current?.(JSON.parse((ev as MessageEvent).data));
          } catch {}
        });
      }
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);

  return { connected };
}
