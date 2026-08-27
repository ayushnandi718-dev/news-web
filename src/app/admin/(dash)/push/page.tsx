"use client";

import { useState, useEffect, useCallback } from "react";

interface PushStats {
  subscriptionCount: number;
}

export default function PushPage() {
  const [stats, setStats] = useState<PushStats | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/push");
      const json = await res.json();
      if (json.ok) setStats(json.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/v1/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.data);
        setTitle("");
        setBody("");
        setUrl("/");
      } else {
        setError(json.error || "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-black text-brand-ink">Push Notifications</h1>

      <div className="rounded border bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Subscribers: <span className="font-bold text-brand">{stats?.subscriptionCount ?? "—"}</span>
        </p>
      </div>

      <div className="rounded border bg-white p-4 shadow-sm space-y-4">
        <h2 className="font-bold text-brand-ink">Send Push Notification</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Breaking: Flood alert in Alipurduar"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message body..."
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">URL (optional)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/news/article-slug"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <p className="text-sm text-green-600">
            Sent to {result.sent} subscribers{result.failed > 0 ? ` (${result.failed} failed)` : ""}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim()}
          className="rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Push"}
        </button>
      </div>
    </div>
  );
}
