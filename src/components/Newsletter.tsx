"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hp) return; // bot
    setState("busy");
    setMsg("");
    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, hp }),
      });
      const json = await res.json();
      if (json.ok) {
        setState("done");
        setMsg(
          json.data.pending
            ? "নিশ্চিতকরণ ইমেল পাঠানো হয়েছে — ইনবক্স দেখুন।"
            : "সাবস্ক্রিপশন হয়েছে — প্রতিদিন সকালে ব্রিফ পাবেন।"
        );
      } else {
        setState("error");
        setMsg(json.error || "সাবস্ক্রাইব করা যায়নি");
      }
    } catch {
      setState("error");
      setMsg("নেটওয়ার্ক সমস্যা");
    }
  }

  return (
    <section className="mt-10 border border-slate-200/80 bg-white">
      <div className="grid md:grid-cols-[1fr_auto] md:items-center">
        <div className="px-5 py-5 sm:px-7">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            সকালের সংক্ষিপ্ত সংবাদ
            <span className="ml-2 bg-brand px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-white">
              ফ্রি
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            প্রতিদিন সকালে আপনার ইনবক্সে আলিপুরদুয়ার ও ডুয়ার্সের সেরা খবর। কোনও স্প্যাম নয়, যখন চান আনসাবস্ক্রাইব করুন।
          </p>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 sm:px-7 md:min-w-[380px] md:border-l md:border-t-0 md:py-0">
          {state === "done" ? (
            <p className="bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</p>
          ) : (
            <form onSubmit={submit} className="flex gap-2">
              <input
                type="text"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <label htmlFor="newsletter-email" className="sr-only">
                ইমেল ঠিকানা
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder="you@example.com"
                className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand"
              />
              <button
                disabled={state === "busy"}
                className="shrink-0 bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {state === "busy" ? "পাঠানো হচ্ছে…" : "সাবস্ক্রাইব"}
              </button>
            </form>
          )}
          {state === "error" && (
            <p className="mt-1.5 text-xs text-brand" role="alert">
              {msg}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
