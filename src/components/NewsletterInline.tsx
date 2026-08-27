"use client";

import { useState } from "react";

export default function NewsletterInline() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hp || state === "done") return;
    setState("busy");
    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, hp }),
      });
      const json = await res.json();
      if (json.ok) setState("done");
    } catch {}
    setState((s) => (s === "busy" ? "idle" : s));
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-emerald-700">
          সাবস্ক্রাইব হয়েছে — প্রতিদিন সকালে ব্রিফ পাবেন!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-4 text-center">
      <p className="text-sm font-bold text-brand-ink">এই খবরটি ভালো লাগলো?</p>
      <p className="mt-0.5 text-xs text-slate-500">
        প্রতিদিন সকালে আলিপুরদুয়ারের সেরা খবর আপনার ইনবক্সে — ফ্রি।
      </p>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <label htmlFor="article-newsletter" className="sr-only">ইমেল</label>
        <input
          id="article-newsletter"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="shrink-0 rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {state === "busy" ? "…" : "সাবস্ক্রাইব"}
        </button>
      </form>
    </div>
  );
}
