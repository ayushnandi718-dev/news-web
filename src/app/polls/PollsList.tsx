"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/v1/polls")
      .then((r) => r.json())
      .then((j) => { if (j.ok) setPolls(j.data); else setError(j.error || "Failed to load polls"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

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
