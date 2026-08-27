"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND } from "@/lib/brand";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (json.ok) {
        router.push("/admin/login");
        return;
      }
      setError(json.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">This link is missing its reset token.</p>
        <a href="/admin/forgot-password" className="mt-4 inline-block text-xs font-semibold text-brand underline-offset-2 hover:underline">
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <h1 className="text-lg font-bold tracking-tight text-brand-ink">Choose a new password</h1>
      <p className="mt-1 text-xs text-slate-500">Minimum 8 characters. All other sessions will be signed out.</p>

      <div className="mt-5">
        <label htmlFor="rp-password" className="block text-xs font-bold uppercase tracking-wide text-slate-600">
          New password
        </label>
        <input
          id="rp-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          minLength={8}
          autoFocus
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
        />
      </div>
      <div className="mt-3">
        <label htmlFor="rp-confirm" className="block text-xs font-bold uppercase tracking-wide text-slate-600">
          Confirm password
        </label>
        <input
          id="rp-confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
          minLength={8}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
        />
        <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-3 w-3 accent-brand" />
          Show passwords
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      <button disabled={busy} className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-xl font-black text-white shadow-sm">ড</span>
        <span className="text-xl font-black tracking-tight text-brand-ink">{BRAND.bn}</span>
      </div>
      <Suspense fallback={<div className="h-72 w-full max-w-sm animate-pulse rounded-xl border border-slate-200 bg-white" />}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
