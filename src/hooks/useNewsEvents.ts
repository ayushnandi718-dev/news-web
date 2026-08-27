"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

export interface AdsEvent {
  type: "ads.updated";
}

export interface LiveUpdatedEvent {
  type: "live.updated";
  hasActive: boolean;
}

export type NewsSocketEvent = LivePublishedEvent | BreakingEvent | AdsEvent | LiveUpdatedEvent | { type: "poll.updated" } | { type: "heartbeat" };

type Listener = (e: NewsSocketEvent) => void;

let sharedEs: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();
const connectedListeners = new Set<(c: boolean) => void>();
let connected = false;

function setConnected(v: boolean) {
  connected = v;
  for (const fn of connectedListeners) fn(v);
}

function connect() {
  if (sharedEs) return;
  const es = new EventSource("/api/v1/events");
  sharedEs = es;
  es.onopen = () => setConnected(true);
  es.onerror = () => {
    setConnected(false);
    es.close();
    sharedEs = null;
    retryTimer = setTimeout(connect, 3000);
  };
  const types = ["article.published", "breaking.updated", "ads.updated", "live.updated", "poll.updated"];
  for (const t of types) {
    es.addEventListener(t, (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as NewsSocketEvent;
        for (const fn of listeners) fn(parsed);
      } catch {}
    });
  }
}

function disconnect() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (sharedEs) { sharedEs.close(); sharedEs = null; }
  setConnected(false);
}

export function useNewsEvents(onEvent?: (e: NewsSocketEvent) => void): { connected: boolean } {
  const [conn, setConn] = useState(connected);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const wrappedListener: Listener = (e) => handlerRef.current?.(e);
    listeners.add(wrappedListener);
    connectedListeners.add(setConn);
    setConn(connected);

    if (listeners.size === 1) connect();

    return () => {
      listeners.delete(wrappedListener);
      connectedListeners.delete(setConn);
      if (listeners.size === 0) disconnect();
    };
  }, []);

  return { connected: conn };
}
