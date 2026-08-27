"use client";

import { useState } from "react";

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
  status?: string;
  totalVotes: number;
  expiresAt: string | null;
}

export default function PollVote({ poll }: { poll: Poll }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Poll | null>(null);

  const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
  const showResults = voted || expired || poll.status !== "ACTIVE";
  const data = result || poll;

  async function handleVote() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/polls/${poll.slug}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId: selected }),
      });
      const j = await r.json();
      if (j.ok) {
        setVotedOption(selected);
        setVoted(true);
        setResult(j.data.poll);
      } else {
        setError(j.error || "Vote failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-brand-ink">{data.question}</h3>
      {data.description && <p className="mt-1 text-xs text-slate-500">{data.description}</p>}
      <div className="mt-3 space-y-2">
        {data.options.map((opt) => {
          const optVotes = opt.votes || 0;
          const pct = data.totalVotes > 0 ? Math.round((optVotes / data.totalVotes) * 100) : 0;
          const isVotedOption = votedOption === opt.id;
          return (
            <label key={opt.id} className={`flex items-center gap-3 rounded-lg border p-3 transition ${showResults ? "cursor-default" : "cursor-pointer"} ${selected === opt.id && !showResults ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300"}`}>
              {showResults ? (
                <div className="relative h-4 flex-1">
                  <div className="absolute inset-0 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isVotedOption ? "bg-brand/40" : "bg-brand/15"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="relative flex items-center justify-between px-1 text-xs">
                    <span className={`font-medium ${isVotedOption ? "text-brand font-bold" : "text-slate-700"}`}>
                      {opt.text} {isVotedOption && <span className="text-[10px]">(আপনি)</span>}
                    </span>
                    <span className={`font-semibold ${isVotedOption ? "text-brand" : "text-slate-500"}`}>{optVotes} ({pct}%)</span>
                  </div>
                </div>
              ) : (
                <>
                  <input type="radio" name={poll.slug} value={opt.id} checked={selected === opt.id} onChange={() => setSelected(opt.id)} className="accent-brand" />
                  <span className="text-sm text-slate-700">{opt.text}</span>
                </>
              )}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {showResults ? (
        <p className="mt-3 text-xs text-slate-400">{data.totalVotes} জন ভোট দিয়েছেন</p>
      ) : (
        <button onClick={handleVote} disabled={!selected || submitting} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand/90 disabled:opacity-50">
          {submitting ? "ভোট দিচ্ছেন..." : "ভোট দিন"}
        </button>
      )}
    </div>
  );
}
