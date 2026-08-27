"use client";

import { useEffect, useState, useCallback } from "react";

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

export default function AdminPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CLOSED" | "DRAFT">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewResults, setViewResults] = useState<Poll | null>(null);

  const load = useCallback(async () => {
    const q = filter !== "ALL" ? `?status=${filter}` : "";
    try {
      const r = await fetch(`/api/v1/admin/polls${q}`);
      const j = await r.json();
      if (j.ok) setPolls(j.data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: { question: string; description?: string; options: Array<{ id: string; text: string }>; status: string; expiresAt?: string }) {
    await fetch("/api/v1/admin/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, options: data.options.map((o) => ({ ...o, votes: 0 })) }),
    });
    setShowForm(false);
    load();
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/polls/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) return;
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/polls/${id}`, { method: "DELETE" });
      load();
    } finally {
      setBusyId(null);
    }
  }

  if (showForm) {
    return <PollEditor onSave={handleCreate} onCancel={() => setShowForm(false)} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-lg font-bold text-brand-ink">পোল ও সার্ভে</h1>
        <div className="ml-auto flex gap-1">
          {(["ALL", "ACTIVE", "CLOSED", "DRAFT"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded px-2.5 py-1 text-xs font-semibold transition ${filter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
          <button onClick={() => setShowForm(true)} className="ml-2 rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand/90">
            + New Poll
          </button>
        </div>
      </div>

      {viewResults && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-brand-ink">{viewResults.question}</h3>
            <button onClick={() => setViewResults(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{viewResults.totalVotes} total votes</p>
          <div className="mt-3 space-y-2">
            {viewResults.options.map((opt) => {
              const pct = viewResults.totalVotes > 0 ? Math.round(((opt.votes || 0) / viewResults.totalVotes) * 100) : 0;
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{opt.text}</span>
                    <span className="text-xs font-semibold text-slate-500">{opt.votes} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <p className="text-sm text-slate-400">No polls yet.</p>
      ) : (
        <div className="space-y-3">
          {polls.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-brand-ink">{p.question}</h3>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : p.status === "CLOSED" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.description && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{p.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.options.map((opt) => (
                      <span key={opt.id} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {opt.text} ({opt.votes || 0})
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{p.totalVotes} votes</span>
                    {p.expiresAt && <span>Expires {new Date(p.expiresAt).toLocaleDateString()}</span>}
                    <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewResults(p)} className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                    Results
                  </button>
                  <button
                    onClick={() => toggleStatus(p.id, p.status)}
                    disabled={busyId === p.id}
                    className={`rounded px-2 py-1 text-xs font-semibold ${p.status === "ACTIVE" ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"} disabled:opacity-50`}
                  >
                    {p.status === "ACTIVE" ? "Close" : "Reopen"}
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={busyId === p.id}
                    className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PollEditor({
  onSave,
  onCancel,
}: {
  onSave: (data: { question: string; description?: string; options: Array<{ id: string; text: string }>; status: string; expiresAt?: string }) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [status, setStatus] = useState("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");

  function addOption() {
    if (options.length < 10) setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-lg font-bold text-brand-ink">New Poll</h2>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Question *</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder="What do you want to ask?" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder="Additional context for the poll" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Options (2-10)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input value={opt} onChange={(e) => updateOption(i, e.target.value)} className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm" placeholder={`Option ${i + 1}`} />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="rounded bg-red-50 px-2 text-xs text-red-600 hover:bg-red-100">
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button onClick={addOption} className="mt-2 text-xs font-semibold text-brand hover:underline">
              + Add option
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Expires (optional)</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
          <button
            onClick={() => {
              const validOptions = options.filter((o) => o.trim()).map((text, i) => ({ id: `opt_${i}_${Date.now()}`, text: text.trim() }));
              if (question.trim() && validOptions.length >= 2) {
                onSave({ question: question.trim(), description: description || undefined, options: validOptions, status, expiresAt: expiresAt || undefined });
              }
            }}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
            className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
}
