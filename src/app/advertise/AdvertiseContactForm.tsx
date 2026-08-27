"use client";

import { useRef, useState } from "react";
import { AD_TYPES, AD_TYPE_LABELS } from "@/lib/pricing";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/**
 * Reader advertisement request form.
 * Submits to /api/v1/advertise-requests → lands in the admin Ads Manager
 * as PENDING_REVIEW. Nothing gets published automatically.
 */
export default function AdvertiseContactForm() {
  const [startedAt] = useState(() => Date.now());
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    type: "HOME_BANNER",
    message: "",
    needsBannerDesign: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    const MAX = 8 * 1024 * 1024;
    if (f && f.size > MAX) {
      setFile(null);
      setPreview(null);
      setErrMsg("ছবির সাইজ ৮ MB-এর বেশি — ছোট ছবি বেছে নিন।");
      setState("error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setErrMsg("");
    try {
      const fd = new FormData();
      fd.append("_startedAt", String(startedAt));
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === "boolean") fd.append(k, v ? "true" : "");
        else fd.append(k, v);
      }
      fd.append("website", website);
      if (file) fd.append("banner", file);

      const res = await fetch("/api/v1/advertise-requests", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) {
        setErrMsg(json.error || "Request pathate samasya holo — ektu por abar try karo.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrMsg("Network samasya — internet check kore abar try karo.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-3xl" aria-hidden>✅</p>
        <h3 className="mt-2 font-black text-emerald-800">অনুরোধ পাঠানো হয়েছে!</h3>
        <p className="mt-1 text-sm leading-relaxed text-emerald-700">
          আপনার বিজ্ঞাপনের অনুরোধ আমাদের টিম পেয়ে গেছে। রিভিউ করে আমরা দ্রুত যোগাযোগ করব —
          প্ল্যান, রেট ও তারিখ সব ঠিক করে নেব।
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" encType="multipart/form-data">
      <h3 className="text-sm font-black uppercase tracking-wider text-brand-ink sm:col-span-2">
        বিজ্ঞাপনের অনুরোধ পাঠান
      </h3>
      <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="আপনার নাম *" aria-label="আপনার নাম" className={inputCls} />
      <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="দোকান / প্রতিষ্ঠানের নাম" aria-label="প্রতিষ্ঠানের নাম" className={inputCls} />
      <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ইমেল *" aria-label="ইমেল" className={inputCls} />
      <input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d+\-\s]/g, ""))} placeholder="ফোন / WhatsApp" aria-label="ফোন" className={inputCls} />
      <select value={form.type} onChange={(e) => set("type", e.target.value)} aria-label="বিজ্ঞাপনের ধরন" className={`${inputCls} sm:col-span-2`}>
        {AD_TYPES.map((t) => (
          <option key={t} value={t}>{AD_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Banner / photo upload — optional */}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-bold text-slate-600">
          ব্যানার / ছবি আপলোড <span className="font-normal text-slate-400">(ঐচ্ছিক)</span>
        </label>
        {preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="ব্যানার প্রিভিউ" className="h-32 rounded-lg border border-slate-200 object-cover" />
            <button
              type="button"
              onClick={removeFile}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow hover:bg-red-600"
              aria-label="ছবি সরান"
            >
              ✕
            </button>
            <p className="mt-1 text-[10px] text-slate-400">{file?.name}</p>
          </div>
        ) : (
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-500 file:mr-3 file:rounded file:border-0 file:bg-brand file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:border-brand"
          />
        )}
        <p className="mt-1 text-[10px] text-slate-400">JPEG, PNG, WebP, GIF — সর্বোচ্চ ৮ MB</p>
      </div>

      {/* Banner design service — extra charge */}
      <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.needsBannerDesign}
          onChange={(e) => setForm((f) => ({ ...f, needsBannerDesign: e.target.checked }))}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="text-xs leading-relaxed text-slate-700">
          <span className="font-bold">আমাদের টিমকে ব্যানার তৈরি করতে দিন</span>{" "}
          <span className="text-amber-600">(অতিরিক্ত চার্জ প্রযোজ্য)</span>
          <br />
          <span className="text-[11px] text-slate-500">
            আপনি যদি নিজে ব্যানার তৈরি না করতে পারেন, আমাদের ডিজাইন টিম এটি তৈরি করে দেবে।
            চার্জ ফাইনাল করার সময় জানানো হবে।
          </span>
        </span>
      </label>

      <textarea
        required
        minLength={10}
        rows={4}
        value={form.message}
        onChange={(e) => set("message", e.target.value)}
        placeholder="কী ধরনের বিজ্ঞাপন চান, কতদিনের জন্য, বাজেট ইত্যাদি লিখুন… *"
        aria-label="বার্তা"
        className={`${inputCls} sm:col-span-2`}
      />
      {/* Honeypot — hidden from humans */}
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
      />

      {state === "error" && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 sm:col-span-2">
          {errMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "busy"}
        className="rounded bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-40 sm:col-span-2"
      >
        {state === "busy" ? "পাঠানো হচ্ছে…" : "অনুরোধ পাঠান"}
      </button>
      <p className="text-center text-xs text-slate-400 sm:col-span-2">
        অনুরোধ পাঠালেই বিজ্ঞাপন চালু হয়ে যায় না — আমাদের টিম রিভিউ করে, রেট ও ডিজাইন ঠিক করে,
        তবেই সাইটে লাইভ হয়।
      </p>
    </form>
  );
}
