"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionRow {
  id: string;
  device: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
  isActive: boolean;
}

interface ActivityRow {
  id: string;
  action: string;
  at: string;
  ok: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "auth.password_changed": "Password changed",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function TwoFactorSection() {
  const [status, setStatus] = useState<"loading" | "enabled" | "setup">("loading");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/admin/2fa")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          if (j.data.enabled) setStatus("enabled");
          else { setQr(j.data.qr); setSecret(j.data.secret); setStatus("setup"); }
        }
      })
      .catch(() => setStatus("setup"));
  }, []);

  async function verify() {
    if (busy || code.length !== 6) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/v1/admin/2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify", code }) });
      const j = await r.json();
      if (j.ok) setStatus("enabled");
      else setError("ভুল কোড। আবার চেষ্টা করুন।");
    } catch { setError("সমস্যা হয়েছে।"); } finally { setBusy(false); }
  }

  async function disable() {
    if (busy || code.length !== 6) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/v1/admin/2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "disable", code }) });
      const j = await r.json();
      if (j.ok) { setStatus("setup"); setCode(""); const rr = await fetch("/api/v1/admin/2fa"); const jj = await rr.json(); if (jj.ok) { setQr(jj.data.qr); setSecret(jj.data.secret); } }
      else setError("ভুল কোড।");
    } catch { setError("সমস্যা হয়েছে।"); } finally { setBusy(false); }
  }

  if (status === "loading") return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-brand-ink">Two-Factor Authentication (2FA)</h2>
      {status === "enabled" ? (
        <div>
          <div className="mt-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-sm font-semibold text-emerald-700">2FA সক্রিয় আছে</span></div>
          <p className="mt-3 text-xs text-slate-500">নিষ্ক্রিয় করতে 6-ডিজিট কোড দিন:</p>
          <div className="mt-2 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] text-center outline-none focus:border-brand font-mono" />
            <button disabled={busy || code.length !== 6} onClick={disable} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">নিষ্ক্রিয় করুন</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mt-2 text-sm text-slate-600">Google Authenticator বা TOTP অ্যাপে QR কোড স্ক্যান করুন।</p>
          {qr && <img src={qr} alt="2FA QR Code" className="mt-4 h-48 w-48 rounded-lg border" />}
          {secret && <div className="mt-3"><p className="text-[11px] font-semibold text-slate-400">ম্যানুয়াল কী:</p><code className="mt-1 block rounded bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 break-all">{secret}</code></div>}
          <div className="mt-4 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] text-center outline-none focus:border-brand font-mono" />
            <button disabled={busy || code.length !== 6} onClick={verify} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50">সক্রিয় করুন</button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </section>
  );
}

export default function SecurityClient({
  currentSid,
  sessions,
  activity,
}: {
  currentSid: string;
  sessions: SessionRow[];
  activity: ActivityRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // change-password form state
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [confirm, setConfirm] = useState("");

  async function call(url: string, body?: unknown) {
    setBusy("api");
    setMsg("");
    setErr("");
    try {
      const res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.ok) {
        setErr(json.error || "Something went wrong");
        return false;
      }
      return json.data;
    } catch {
      setErr("Network problem");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function revokeOne(id: string) {
    const done = await call("/api/v1/admin/sessions", { scope: "one", sessionId: id });
    if (done) { setMsg("Session revoked"); router.refresh(); }
  }

  async function revokeOthers() {
    const done = await call("/api/v1/admin/sessions", { scope: "others" });
    if (done) { setMsg(`Signed out ${(done as { revoked: number }).revoked} other session(s)`); router.refresh(); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr("");
    if (nw !== confirm) { setErr("New passwords do not match"); return; }
    if (nw.length < 8) { setErr("New password must be at least 8 characters"); return; }
    const done = await call("/api/v1/admin/password-change", { currentPassword: cur, newPassword: nw });
    if (done) {
      setMsg(`Password changed — ${(done as { revokedOthers: number }).revokedOthers} other session(s) signed out`);
      setCur(""); setNw(""); setConfirm("");
      router.refresh();
    }
  }

  const active = sessions.filter((s) => s.isActive);
  const past = sessions.filter((s) => !s.isActive);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-brand-ink">Security</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your password and active sign-ins.</p>
      </header>

      <div aria-live="polite">
        {msg && <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</p>}
        {!msg && err && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      </div>

      {/* Change password */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-brand-ink">Change password</h2>
        <p className="mt-0.5 text-xs text-slate-500">Your other devices will be signed out automatically.</p>
        <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-600">
            Current password
            <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required minLength={6} disabled={busy === "api"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            New password
            <input type="password" autoComplete="new-password" value={nw} onChange={(e) => setNw(e.target.value)} required minLength={8} disabled={busy === "api"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Confirm new password
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} disabled={busy === "api"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" />
          </label>
          <div className="sm:col-span-3">
            <button disabled={busy === "api"} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">
              {busy === "api" ? "Working…" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      {/* Two-Factor Authentication */}
      <TwoFactorSection />

      {/* Active sessions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-brand-ink">Active sessions ({active.length})</h2>
            <p className="mt-0.5 text-xs text-slate-500">Devices currently signed in as you.</p>
          </div>
          {active.length > 1 && (
            <button onClick={revokeOthers} disabled={busy === "api"} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
              Sign out all other devices
            </button>
          )}
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {active.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {s.device}
                  {s.isCurrent && <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">This device</span>}
                </p>
                <p className="text-xs text-slate-500">IP {s.ip} · signed in {fmt(s.createdAt)} · last used {fmt(s.lastUsedAt)}</p>
              </div>
              {!s.isCurrent && (
                <button onClick={() => revokeOne(s.id)} disabled={busy === "api"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50">
                  Revoke
                </button>
              )}
            </li>
          ))}
          {active.length === 0 && <li className="py-3 text-sm text-slate-500">No active sessions.</li>}
        </ul>
      </section>

      {/* Login activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-brand-ink">Recent login activity</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5">
              <span className={`text-sm font-semibold ${a.ok ? "text-slate-700" : "text-red-600"}`}>{ACTION_LABELS[a.action] ?? a.action}</span>
              <span className="text-xs text-slate-400">{fmt(a.at)}</span>
            </li>
          ))}
          {activity.length === 0 && <li className="py-2 text-sm text-slate-500">Nothing yet.</li>}
        </ul>
      </section>

      {/* Past sessions */}
      {past.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-bold text-slate-600">Past sessions ({past.length})</summary>
          <ul className="mt-3 divide-y divide-slate-100">
            {past.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-xs text-slate-500">
                <span>{s.device} · IP {s.ip}</span>
                <span>{s.revokedAt ? `revoked ${fmt(s.revokedAt)}` : `expired ${fmt(s.expiresAt)}`}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
