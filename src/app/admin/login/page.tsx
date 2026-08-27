"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND } from "@/lib/brand";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      )}
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/admin";
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 2FA state
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { email, password, rememberMe, next: nextPath };
      if (pendingToken) {
        body.pendingToken = pendingToken;
        body.totpCode = totpCode;
      }
      const res = await fetch("/api/v1/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        if (pendingToken) {
          setError("ভুল কোড। আবার চেষ্টা করুন।");
          setTotpCode("");
        } else {
          setError(res.status === 429 ? "Too many attempts. Please wait a few minutes." : "Invalid email or password.");
          setPassword("");
        }
        return;
      }
      if (json.data.requires2FA) {
        setPendingToken(json.data.pendingToken);
        setTotpCode("");
        setError("");
        return;
      }
      router.push(json.data.redirect || "/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,.06),0_8px_24px_rgba(15,23,42,.06)]" noValidate>
      <h1 className="text-center text-lg font-black tracking-tight text-brand-ink">Newsroom Access</h1>
      <p className="mt-1 text-center text-xs text-slate-500">{pendingToken ? "Two-Factor Authentication" : `Sign in to the ${BRAND.en} newsroom`}</p>

      {!pendingToken ? (
        <>
          <div className="mt-6">
            <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wide text-slate-600">Email</label>
            <input ref={emailRef} id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" required />
          </div>
          <div className="mt-4">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wide text-slate-600">Password</label>
            <div className="relative mt-1">
              <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" required />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-slate-400 transition hover:text-brand-ink">
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-3.5 w-3.5 accent-brand" />
            Remember me for 30 days
          </label>
        </>
      ) : (
        <div className="mt-6">
          <p className="text-xs text-slate-500 text-center mb-3">আপনার অ্যাপ থেকে 6-ডিজিট কোড দিন।</p>
          <label htmlFor="login-totp" className="block text-xs font-bold uppercase tracking-wide text-slate-600">Verification Code</label>
          <input ref={emailRef} id="login-totp" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} pattern="[0-9]{6}" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} disabled={busy} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-lg tracking-[0.4em] font-mono outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" required />
          <button type="button" onClick={() => { setPendingToken(""); setTotpCode(""); setError(""); }} className="mt-3 text-xs font-semibold text-slate-500 hover:text-brand">← Back to login</button>
        </div>
      )}

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
        )}
      </div>

      <button disabled={busy} className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50">
        {busy ? "Signing in…" : pendingToken ? "Verify" : "Sign in"}
      </button>

      {!pendingToken && (
        <p className="mt-4 text-center">
          <a href="/admin/forgot-password" className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-brand hover:underline">Forgot password?</a>
        </p>
      )}

      <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Authorized newsroom staff only
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="flex h-11 min-w-11 items-center justify-center rounded-lg bg-brand px-1.5 text-lg font-black tracking-tight text-white shadow-sm">DK</span>
        <span className="text-xl font-black tracking-tight text-brand-ink">{BRAND.bn}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{BRAND.en}</span>
      </div>
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-xl border border-slate-200 bg-white" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
