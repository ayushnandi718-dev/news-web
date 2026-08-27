"use client";

import { useEffect, useState, useCallback } from "react";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import PollVote from "./PollVote";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  options: PollOption[];
  totalVotes: number;
  expiresAt: string | null;
  status?: string;
}

export default function PollWidget() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/polls", { cache: "no-store" });
      const j = await r.json();
      if (j.ok && j.data.length > 0) setPoll(j.data[0]);
      else setPoll(null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useNewsEvents((e) => {
    if (e.type === "poll.updated") load();
  });

  if (loading) return null;
  if (!poll) return null;

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">মতামত জানান</h3>
      <PollVote poll={poll} />
    </div>
  );
}
