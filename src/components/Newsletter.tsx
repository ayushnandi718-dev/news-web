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
    <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 text-center">
      <h2 className="text-lg font-extrabold uppercase tracking-wide text-brand-ink">The Morning Brief</h2>
      <p className="mt-1 text-sm text-slate-600">Top stories, every morning. No spam, unsubscribe anytime.</p>
      {state === "done" ? (
        <p className="mt-4 rounded bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
          Subscribed — check your inbox to confirm.
        </p>
      ) : (
        <form onSubmit={submit} className="mx-auto mt-4 flex max-w-md gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setState("idle");
            }}
            placeholder="you@example.com"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
            Subscribe
          </button>
        </form>
      )}
      {state === "error" && <p className="mt-2 text-xs text-red-600">Please enter a valid email address.</p>}
    </section>
  );
}
