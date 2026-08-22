"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setState("error");
      return;
    }
    setState("done");
  }

  return (
    <section className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid md:grid-cols-[1fr_auto] md:items-center">
        <div className="px-5 py-5 sm:px-7">
          <h2 className="text-lg font-black tracking-tight text-brand-ink">
            The Morning Brief
            <span className="ml-2 rounded bg-brand px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-white">Free</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">Top stories in your inbox every morning. No spam, unsubscribe anytime.</p>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 md:border-l md:border-t-0 md:py-0 sm:px-7 md:min-w-[380px]">
          {state === "done" ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Subscribed — check your inbox to confirm.
            </p>
          ) : (
            <form onSubmit={submit} className="flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setState("idle");
                }}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand"
              />
              <button className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">
                Subscribe
              </button>
            </form>
          )}
          {state === "error" && (
            <p className="mt-1.5 text-xs text-red-600" role="alert">
              Please enter a valid email address.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
