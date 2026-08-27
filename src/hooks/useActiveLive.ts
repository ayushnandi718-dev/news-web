"use client";

import { useCallback, useEffect, useState } from "react";
import { useNewsEvents } from "./useNewsEvents";

/**
 * Detects whether any live stream is currently active.
 * Polls /api/v1/live/check every 60s + listens for live.updated SSE events
 * via the shared SSE singleton (no duplicate connections).
 */
export function useActiveLive(pollMs = 60_000): { hasActive: boolean; loading: boolean } {
  const [hasActive, setHasActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/live/check", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setHasActive(json.data.hasActive);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  useNewsEvents((e) => {
    if (e.type === "live.updated" && "hasActive" in e) {
      setHasActive(e.hasActive);
    }
  });

  return { hasActive, loading };
}
