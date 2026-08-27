"use client";

import { useEffect, useState } from "react";
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
}

export default function PollWidget() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/polls")
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.data.length > 0) setPoll(j.data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!poll) return null;

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">মতামত জানান</h3>
      <PollVote poll={poll} />
    </div>
  );
}
