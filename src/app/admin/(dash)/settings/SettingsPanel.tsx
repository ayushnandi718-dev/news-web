"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/components/ui/overlay";

interface FormState {
  siteNameBn: string;
  siteNameEn: string;
  tagline: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactAddress: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  xUrl: string;
}

const EMPTY: FormState = {
  siteNameBn: "",
  siteNameEn: "",
  tagline: "",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  contactAddress: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  xUrl: "",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function AdminSettings() {
  const { toast, modal } = useUI();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/settings", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login?next=%2Fadmin%2Fsettings";
        return;
      }
      const json = await res.json();
      if (json.ok) setForm((f) => ({ ...f, ...json.data.settings }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", "site-logo");
    try {
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        toast(json.error || "Logo upload failed", "error");
        return;
      }
      set("logoUrl", json.data.media.url);
      toast("Logo uploaded", "success");
    } catch {
      toast("Logo upload failed", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login?next=%2Fadmin%2Fsettings";
        return;
      }
      const json = await res.json();
      if (!json.ok) {
        modal({
          title: "Could not save settings",
          content: (
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </span>
              <p className="text-sm leading-relaxed text-slate-700">{json.error || "Something went wrong. Please try again."}</p>
            </div>
          ),
        });
        return;
      }
      modal({
        title: "Settings saved",
        content: (
          <div>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <p className="text-sm leading-relaxed text-slate-700">
                Website settings updated. The header, footer, <b>/contact</b> and{" "}
                <b>/advertise</b> pages now reflect your changes.
              </p>
            </div>
          </div>
        ),
      });
    } catch {
      toast("Network error — settings not saved", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="section-title">Site Settings</h1>
      <p className="-mt-2 mb-4 text-sm text-slate-500">
        Everything about how the website presents itself — name, logo, contact details and social
        links. Changes go live immediately after saving.
      </p>

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
          {/* Branding */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 border-l-2 border-brand pl-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Branding
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website Name (Bengali)" hint="Header, footer aur browser tab mein dikhta hai.">
                <input required value={form.siteNameBn} onChange={(e) => set("siteNameBn", e.target.value)} placeholder="ডুয়ার্সের খবর" aria-label="Website name Bengali" className={inputCls} />
              </Field>
              <Field label="Website Name (English)" hint="Small caps line under the Bengali name.">
                <input value={form.siteNameEn} onChange={(e) => set("siteNameEn", e.target.value)} placeholder="DUARSER KHABAR" aria-label="Website name English" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Tagline" hint="Top strip (desktop) par chhota slogan.">
                  <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="আলিপুরদুয়ারের নিজস্ব সংবাদমাধ্যম" aria-label="Tagline" className={inputCls} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Logo" hint="Square/transparent PNG best dikhta hai (~80×80px). Empty = sirf naam.">
                  <div className="flex items-center gap-3">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="" className="h-12 w-12 rounded border border-slate-200 object-contain p-0.5" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] font-bold text-slate-400">LOGO</span>
                    )}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
                      ⬆ Upload
                    </button>
                    <input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="…ya image URL paste karo" aria-label="Logo URL" className={`${inputCls} flex-1`} />
                    {form.logoUrl && (
                      <button type="button" onClick={() => set("logoUrl", "")} className="text-xs font-semibold text-red-500 hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 border-l-2 border-brand pl-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Contact Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Newsroom Email" hint="/contact aur /advertise page par dikhta hai.">
                <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="newsroom@duarserskhabar.in" aria-label="Newsroom email" className={inputCls} />
              </Field>
              <Field label="Phone Number" hint="Empty chhodne par hide ho jayega.">
                <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+91 90000 00000" aria-label="Phone number" className={inputCls} />
              </Field>
              <Field label="WhatsApp Number" hint="Digits only for the wa.me link, e.g. 919000000000.">
                <input value={form.contactWhatsapp} onChange={(e) => set("contactWhatsapp", e.target.value)} placeholder="919000000000" aria-label="WhatsApp number" className={inputCls} />
              </Field>
              <Field label="Address" hint="/contact page ke address section mein.">
                <input value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} placeholder="আলিপুরদুয়ার, পশ্চিমবঙ্গ" aria-label="Address" className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Social media */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 border-l-2 border-brand pl-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Follow Us Links (Footer)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook URL">
                <input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} placeholder="https://facebook.com/…" aria-label="Facebook URL" className={inputCls} />
              </Field>
              <Field label="Instagram URL">
                <input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" aria-label="Instagram URL" className={inputCls} />
              </Field>
              <Field label="YouTube URL">
                <input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} placeholder="https://youtube.com/@…" aria-label="YouTube URL" className={inputCls} />
              </Field>
              <Field label="X (Twitter) URL">
                <input value={form.xUrl} onChange={(e) => set("xUrl", e.target.value)} placeholder="https://x.com/…" aria-label="X URL" className={inputCls} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Khali field ka icon footer se automatically hat jayega. WhatsApp icon Newsroom WhatsApp number se banta hai.
            </p>
          </section>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Saving…" : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}

export default AdminSettings;
export const SettingsPanel = AdminSettings;
