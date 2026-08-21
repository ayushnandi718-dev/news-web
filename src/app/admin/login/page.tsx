"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@newsroom.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4">
      <form onSubmit={submit} className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-brand-ink">Newsroom Login</h1>
        <p className="mt-1 text-xs text-slate-500">Seeded users: admin@newsroom.test / Admin@12345 · editor@newsroom.test / Editor@12345</p>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          required
        />
        <label className="mt-3 block text-sm font-semibold text-slate-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          required
        />
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="mt-4 w-full rounded bg-brand py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
