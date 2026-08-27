"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(true);
      } else {
        setError(json.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-xl font-black text-white shadow-sm">ড</span>
        <span className="text-xl font-black tracking-tight text-brand-ink">{BRAND.bn}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{BRAND.en}</span>
      </div>

      {done ? (
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm" aria-live="polite">
          <h1 className="text-base font-bold text-brand-ink">Check your inbox</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            If an account exists for <span className="font-semibold text-slate-700">{email}</span>, a password reset link has been sent.
            The link expires in 30 minutes.
          </p>
          <a href="/admin/login" className="mt-5 inline-block text-xs font-semibold text-brand underline-offset-2 hover:underline">
            Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-brand-ink">Forgot your password?</h1>
          <p className="mt-1 text-xs text-slate-500">Enter your newsroom email and we&apos;ll send a reset link.</p>

          <label htmlFor="fp-email" className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoFocus
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
          />

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <button disabled={busy} className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="mt-4 text-center">
            <a href="/admin/login" className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-brand hover:underline">
              Back to sign in
            </a>
          </p>
        </form>
      )}
    </main>
  );
}
