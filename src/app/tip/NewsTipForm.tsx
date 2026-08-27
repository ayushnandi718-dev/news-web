"use client";

import { useState } from "react";

export default function NewsTipForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);

    let imageUrl: string | undefined;
    if (photo) {
      const fd = new FormData();
      fd.append("file", photo);
      try {
        const up = await fetch("/api/v1/public/media", { method: "POST", body: fd });
        const j = await up.json();
        if (j.ok) imageUrl = j.data.url;
      } catch {}
    }

    try {
      const res = await fetch("/api/v1/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || undefined, phone: phone || undefined, message, imageUrl }),
      });
      const j = await res.json();
      setResult(j.ok ? "ok" : "err");
    } catch {
      setResult("err");
    } finally {
      setBusy(false);
    }
  }

  if (result === "ok") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        ধন্যবাদ! আপনার টিপ জমা হয়েছে। আমরা যাচাই করে প্রকাশ করব।
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-slate-600">খবর *</label>
        <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" placeholder="বিস্তারিত লিখুন..." />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600">ছবি (ঐচ্ছিক)</label>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-slate-600">আপনার নাম (ঐচ্ছিক)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600">ফোন (ঐচ্ছিক)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
      </div>
      {result === "err" && <p className="text-xs text-red-600">সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>}
      <button disabled={busy} className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">
        {busy ? "জমা হচ্ছে..." : "টিপ জমা দিন"}
      </button>
    </form>
  );
}
