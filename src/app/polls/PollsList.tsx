"use client";

import { useCallback, useEffect, useState } from "react";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import PollVote from "@/components/PollVote";

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
  status: string;
  expiresAt: string | null;
  totalVotes: number;
  createdAt: string;
}

export default function PollsList() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/polls", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) { setPolls(j.data); setError(null); }
      else setError(j.error || "Failed to load polls");
    } catch { setError("Network error"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useNewsEvents((e) => {
    if (e.type === "poll.updated") load();
  });

  if (loading) return <div className="text-center text-sm text-slate-400 py-8">Loading...</div>;
  if (error) return <div className="text-center text-sm text-red-500 py-8">{error}</div>;
  if (polls.length === 0) return <div className="text-center text-sm text-slate-400 py-8">কোনো সক্রিয় পোল নেই</div>;

  return (
    <div className="space-y-6">
      {polls.map((poll) => (
        <PollVote key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
