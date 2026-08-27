"use client";

import { useEffect, useState } from "react";

interface CommentRow {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export default function Comments({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [items, setItems] = useState<CommentRow[] | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/v1/news/${slug}/comments`, { cache: "no-store" });
      const json = await res.json();
      setItems(json.ok ? json.data.items : []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    if (enabled) load();
  }, [slug, enabled]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/v1/comments?slug=${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorName: name, body }),
      });
      const json = await res.json();
      if (json.ok) {
        setMsg("ধন্যবাদ — আপনার মন্তব্য মডারেশনের অপেক্ষায় আছে।");
        setBody("");
      } else {
        setMsg(json.error || "মন্তব্য পোস্ট করা যায়নি");
      }
    } catch {
      setMsg("নেটওয়ার্ক সমস্যा");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <section className="mt-10">
      <h2 className="section-title">মন্তব্য</h2>
      <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="আপনার নাম"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          required
          minLength={2}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="মন্তব্য লিখুন…"
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          required
          minLength={3}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">মন্তব্য প্রকাশের আগে পর্যালোচনা করা হয়।</span>
          <button disabled={busy} className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? "পাঠানো হচ্ছে…" : "মন্তব্য পাঠান"}
          </button>
        </div>
        {msg && <p className="text-xs text-slate-600">{msg}</p>}
      </form>

      <div className="mt-4 space-y-3">
        {items === null ? (
          <p className="text-sm text-slate-400">মন্তব্য লোড হচ্ছে…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">এখনও কোনও অনুমোদিত মন্তব্য নেই।</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-100 bg-white p-3">
              <p className="text-sm font-bold text-slate-800">{c.authorName}</p>
              <p className="mt-0.5 text-sm text-slate-600">{c.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
