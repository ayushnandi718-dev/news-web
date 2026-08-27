"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/components/ui/overlay";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  AD_TYPES,
  AD_TYPE_LABELS,
  AD_PLACEMENTS,
  AD_PLACEMENT_LABELS,
  AD_SIZES,
  AD_SIZE_LABELS,
  AD_STATUSES,
  AD_STATUS_LABELS,
  AD_STATUS_COLORS,
  estimatePrice,
  formatINR,
  type PricingRow,
} from "@/lib/pricing";
import RevenueDashboard from "./RevenueDashboard";

interface Ad {
  id: string;
  internalName: string;
  slug: string;
  advertiserName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  destinationUrl: string | null;
  type: string;
  placement: string;
  size: string;
  price: number;
  priority: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
}

interface AdRequest {
  id: string;
  name: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  type: string;
  message: string;
  bannerUrl: string | null;
  needsBannerDesign: boolean;
  status: string;
  createdAt: string;
  advertisements: { id: string; internalName: string; status: string }[];
}

interface FormState {
  internalName: string;
  slug: string;
  advertiserName: string;
  businessName: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  type: string;
  placement: string;
  size: string;
  price: string;
  priority: string;
  status: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = {
  internalName: "",
  slug: "",
  advertiserName: "",
  businessName: "",
  email: "",
  phone: "",
  title: "",
  description: "",
  imageUrl: "",
  destinationUrl: "",
  type: "TOP_BANNER",
  placement: "HOME_TOP",
  size: "MEDIUM",
  price: "",
  priority: "0",
  status: "DRAFT",
  startDate: "",
  endDate: "",
};

type Tab = "ads" | "requests" | "pricing" | "revenue";

function StatusChip({ s }: { s: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${AD_STATUS_COLORS[s] ?? "bg-slate-100 text-slate-600"}`}>
      {AD_STATUS_LABELS[s] ?? s}
    </span>
  );
}

function AdminAds() {
  const { toast, confirm, modal } = useUI();
  const [tab, setTab] = useState<Tab>("ads");
  const [items, setItems] = useState<Ad[]>([]);
  const [requests, setRequests] = useState<AdRequest[]>([]);
  const [rates, setRates] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
const [adDragOver, setAdDragOver] = useState(false);
  const pendingReqRef = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [adsRes, reqRes] = await Promise.all([
        fetch("/api/v1/admin/ads", { cache: "no-store" }),
        fetch("/api/v1/admin/ads/requests", { cache: "no-store" }),
      ]);
      const adsJson = await adsRes.json();
      const reqJson = await reqRes.json();
      if (adsJson.ok) setItems(adsJson.data.items);
      if (reqJson.ok) setRequests(reqJson.data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRates = useCallback(async () => {
    const res = await fetch("/api/v1/admin/ads/pricing", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setRates(json.data.rows);
  }, []);

  useEffect(() => {
    loadAll();
    loadRates();
  }, [loadAll, loadRates]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(ad: Ad) {
    setEditingId(ad.id);
    pendingReqRef.current = null;
    setForm({
      internalName: ad.internalName,
      slug: ad.slug,
      advertiserName: ad.advertiserName,
      businessName: ad.businessName ?? "",
      email: ad.email ?? "",
      phone: ad.phone ?? "",
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl ?? "",
      destinationUrl: ad.destinationUrl ?? "",
      type: ad.type,
      placement: ad.placement,
      size: ad.size,
      price: String(ad.price),
      priority: String(ad.priority),
      status: ad.status,
      startDate: ad.startDate ? new Date(ad.startDate).toISOString().slice(0, 16) : "",
      endDate: ad.endDate ? new Date(ad.endDate).toISOString().slice(0, 16) : "",
    });
    setShowForm(true);
    setTab("ads");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Prefill the create form from a reader request. */
  function createFromRequest(r: AdRequest) {
    setEditingId(null);
    const designTag = r.needsBannerDesign ? " [Banner Design Required]" : "";
    setForm({
      ...EMPTY_FORM,
      internalName: `${r.businessName || r.name} — ${AD_TYPE_LABELS[r.type] ?? r.type}${designTag}`,
      advertiserName: r.name,
      businessName: r.businessName ?? "",
      email: r.email,
      phone: r.phone ?? "",
      type: r.type,
      imageUrl: r.bannerUrl ?? "",
      status: "PENDING_PAYMENT",
    });
    setShowForm(true);
    setTab("ads");
    // remember request id so the created ad gets linked back to it
    pendingReqRef.current = r.id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function suggestPrice() {
    if (!editingId) {
      try {
        const res = await fetch("/api/v1/admin/ads/pricing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: form.type, placement: form.placement, size: form.size, days: daysBetween() }),
        });
        const json = await res.json();
        if (json.ok) {
          set("price", String(json.data.price));
          toast("Rate card se price calculate ho gaya", "info");
        } else {
          toast("Is combination ke liye koi rate nahi — manually bhar do", "warning");
        }
      } catch {
        toast("Price calculate nahi hua", "error");
      }
    }
  }

  function daysBetween(): number {
    if (!form.startDate || !form.endDate) return 30;
    const d = Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000);
    return Math.max(1, d);
  }

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", form.internalName || "advertisement");
    try {
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        toast(json.error || "Image upload failed", "error");
        return;
      }
      set("imageUrl", json.data.media.url);
      toast("Creative uploaded", "success");
    } catch {
      toast("Image upload failed", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.internalName.trim()) {
      modal({
        title: "Missing information",
        content: (
          <SavePopup
            ok={false}
            message="Internal Name is required before you can save this advertisement."
          />
        ),
      });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        internalName: form.internalName,
        slug: form.slug || undefined,
        advertiserName: form.advertiserName,
        businessName: form.businessName || null,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl || null,
        destinationUrl: form.destinationUrl || null,
        type: form.type,
        placement: form.placement,
        size: form.size,
        price: Number(form.price) || 0,
        priority: Number(form.priority) || 0,
        status: form.status,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        ...(pendingReqRef.current ? { requestId: pendingReqRef.current } : {}),
      };
      const res = await fetch(editingId ? `/api/v1/admin/ads/${editingId}` : "/api/v1/admin/ads", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) {
        // Save failed — popup dikhao, form OPEN hi rakho taaki data na jaye.
        modal({
          title: "Could not save advertisement",
          content: (
            <SavePopup
              ok={false}
              message={json.error || "Something went wrong while saving. Please check the fields and try again."}
            />
          ),
        });
        return;
      }
      const savedAd = json.data.ad as Ad;
      // Link source request → created ad
      if (!editingId && pendingReqRef.current && savedAd?.id) {
        await fetch(`/api/v1/admin/ads/requests/${pendingReqRef.current}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "REVIEWED" }),
        }).catch(() => {});
        pendingReqRef.current = null;
      }
      const wentLive = savedAd.status === "ACTIVE";
      // Success — form band karo aur confirmation popup dikhao.
      setShowForm(false);
      setEditingId(null);
      await Promise.all([loadAll(), loadRates()]);
      modal({
        title: wentLive ? "Advertisement is LIVE" : "Advertisement saved",
        content: (
          <SavePopup
            ok
            live={wentLive}
            message={
              wentLive
                ? "Saved successfully. This ad is now visible to readers — open reader pages update automatically without any refresh."
                : `Saved successfully with status “${AD_STATUS_LABELS[savedAd.status] ?? savedAd.status}”. Readers will see it only after you activate it.`
            }
            ad={savedAd}
          />
        ),
      });
    } catch {
      modal({
        title: "Network problem",
        content: (
          <SavePopup
            ok={false}
            message="Could not reach the server. Your form is still open with all data intact — please try saving again."
          />
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(ad: Ad, status: string) {
    if (status === "REJECTED") {
      const okRej = await confirm({ title: "Reject ad?", message: `“${ad.internalName}” reject ho jayega aur readers ko nahi dikhega.`, confirmText: "Reject", danger: true });
      if (!okRej) return;
    }
    await fetch(`/api/v1/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast(`Status: ${AD_STATUS_LABELS[status]}`, status === "ACTIVE" ? "success" : "info");
    await loadAll();
  }

  async function removeAd(ad: Ad) {
    const okDel = await confirm({
      title: "Delete ad?",
      message: `“${ad.internalName}” hamesha ke liye delete ho jayega.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!okDel) return;
    await fetch(`/api/v1/admin/ads/${ad.id}`, { method: "DELETE" });
    toast("Ad deleted", "info");
    await loadAll();
  }

  async function resetCounters(ad: Ad) {
    await fetch(`/api/v1/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resetCounters: true }),
    });
    toast("Counters reset", "info");
    await loadAll();
  }

  async function updateRequest(id: string, status: string) {
    await fetch(`/api/v1/admin/ads/requests/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast(status === "REJECTED" ? "Request reject kiya" : "Request reviewed mark kiya", "info");
    await loadAll();
  }

  async function deleteRequest(r: AdRequest) {
    const okDel = await confirm({ title: "Delete request?", message: `${r.name} ki request delete ho jayegi.`, confirmText: "Delete", danger: true });
    if (!okDel) return;
    await fetch(`/api/v1/admin/ads/requests/${r.id}`, { method: "DELETE" });
    toast("Request deleted", "info");
    await loadAll();
  }

  function previewAd(ad: Ad) {
    modal({
      title: `Preview — ${ad.internalName}`,
      content: (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Public website par aisa dikhega ({AD_PLACEMENT_LABELS[ad.placement]})
          </p>
          <div className="rounded-xl border border-slate-200 bg-white">
            {ad.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.imageUrl} alt={ad.title} className="max-h-56 w-full rounded-t-xl object-contain bg-slate-50" />
            ) : (
              <div className="rounded-t-xl bg-brand px-4 py-6 text-center text-lg font-black text-white">{ad.title}</div>
            )}
            <div className="p-3">
              <span className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">বিজ্ঞাপন</span>
              {ad.description ? (
                <div className="ad-rich mt-2 text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: ad.description }} />
              ) : null}
              {ad.destinationUrl ? <p className="mt-1 truncate text-xs text-slate-400">{ad.destinationUrl}</p> : null}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-slate-400">Advertiser</dt><dd className="font-semibold">{ad.advertiserName || "—"}</dd>
            <dt className="text-slate-400">Type</dt><dd>{AD_TYPE_LABELS[ad.type]}</dd>
            <dt className="text-slate-400">Size</dt><dd>{AD_SIZE_LABELS[ad.size]}</dd>
            <dt className="text-slate-400">Price</dt><dd className="font-bold text-brand">{formatINR(ad.price)}</dd>
            <dt className="text-slate-400">Window</dt>
            <dd>{ad.startDate || ad.endDate ? `${fmtD(ad.startDate)} → ${fmtD(ad.endDate)}` : "हमेशा"}</dd>
            <dt className="text-slate-400">Stats</dt><dd className="tabular-nums">{ad.impressions.toLocaleString()} imp · {ad.clicks.toLocaleString()} clk</dd>
          </dl>
        </div>
      ),
    });
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING_REVIEW").length;
  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Ads Manager</h1>
        <button onClick={openCreate} className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark">
          + Create Advertisement
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {([
          ["ads", `Advertisements (${items.length})`],
          ["requests", `Requests${pendingCount ? ` (${pendingCount} new)` : ""}`],
          ["pricing", "Rate Card"],
          ["revenue", "Revenue"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition ${
              tab === t ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ads" && (
        <>
          {showForm && (
            <form onSubmit={save} className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
                {editingId ? "Edit Advertisement" : "Create Advertisement"}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={form.internalName} onChange={(e) => set("internalName", e.target.value)} placeholder="Internal Name *" aria-label="Internal name" className={inputCls} />
                <input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^\p{L}\p{M}\p{N}-]/gu, "-").replace(/-+/g, "-"))} placeholder="URL slug (auto-generated if blank)" aria-label="Slug" className={inputCls} />
                <input value={form.advertiserName} onChange={(e) => set("advertiserName", e.target.value)} placeholder="Advertiser Name" aria-label="Advertiser name" className={inputCls} />
                <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Business / Organization" aria-label="Business name" className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Contact Email" aria-label="Contact email" className={inputCls} />
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone / WhatsApp" aria-label="Phone" className={inputCls} />
                </div>

                <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ad Title (public pe dikhta hai)" aria-label="Ad title" className={`${inputCls} sm:col-span-2`} />

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                  <RichTextEditor value={form.description} onChange={(html) => set("description", html)} placeholder="Write advertisement description…" />
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setAdDragOver(true);
                  }}
                  onDragLeave={() => setAdDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setAdDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && f.type.startsWith("image/")) handleUpload(f);
                  }}
                  className={`sm:col-span-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
                    adDragOver ? "border-brand bg-brand/5" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="Creative Image URL — ya device se image drop karo" aria-label="Image URL" className={inputCls} />
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">
                      ⬆ Choose file
                    </button>
                    {form.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imageUrl} alt="" className="h-9 w-20 rounded object-cover" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Drag &amp; drop creative image here (JPEG, PNG, WebP, GIF — max 8 MB)</p>
                </div>

                <input value={form.destinationUrl} onChange={(e) => set("destinationUrl", e.target.value)} placeholder="Destination URL (click par khulega)" aria-label="Destination URL" className={`${inputCls} sm:col-span-2`} />

                <select value={form.type} onChange={(e) => set("type", e.target.value)} aria-label="Advertisement type" className={inputCls}>
                  {AD_TYPES.map((t) => <option key={t} value={t}>{AD_TYPE_LABELS[t]}</option>)}
                </select>
                <select value={form.placement} onChange={(e) => set("placement", e.target.value)} aria-label="Placement" className={inputCls}>
                  {AD_PLACEMENTS.map((p) => <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>)}
                </select>
                <select value={form.size} onChange={(e) => set("size", e.target.value)} aria-label="Size" className={inputCls}>
                  {AD_SIZES.map((s) => <option key={s} value={s}>{AD_SIZE_LABELS[s]}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">₹</span>
                  <input inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="Price" aria-label="Price" className={inputCls} />
                  {!editingId && (
                    <button type="button" onClick={suggestPrice} title="Rate card se calculate karo" className="whitespace-nowrap rounded border border-brand px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-red-50">
                      Calc
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-slate-500">Start</span>
                  <input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} aria-label="Start date" className={inputCls} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-slate-500">End</span>
                  <input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} aria-label="End date" className={inputCls} />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-slate-500">Priority</span>
                  <input type="number" min={0} max={9999} value={form.priority} onChange={(e) => set("priority", e.target.value)} aria-label="Priority" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  <span className="text-xs text-slate-400">(chhota = pehle)</span>
                </label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} aria-label="Status" className={inputCls}>
                  {AD_STATUSES.map((s) => <option key={s} value={s}>{AD_STATUS_LABELS[s]} ({s})</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Sirf <b>ACTIVE</b> status wale ads readers ko dikhte hain (date window ke andar).
              </p>
              <div className="mt-3 flex gap-2">
                <button type="submit" disabled={busy} className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40">
                  {busy ? "Saving…" : editingId ? "Save Advertisement" : "Save Advertisement"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); pendingReqRef.current = null; }} className="rounded px-4 py-2 text-sm font-semibold text-slate-500 hover:text-brand">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Advertisement</th>
                  <th className="px-3 py-2">Advertiser</th>
                  <th className="px-3 py-2">Placement</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {a.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.imageUrl} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-brand/10 text-[9px] font-black text-brand">AD</span>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[160px] truncate font-semibold">{a.internalName}</p>
                          <p className="truncate text-xs text-slate-400">{a.impressions.toLocaleString()} imp · {a.clicks.toLocaleString()} clk
                            <button onClick={() => resetCounters(a)} className="ml-1 text-[10px] underline hover:text-brand">reset</button>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-700">{a.advertiserName || "—"}</p>
                      <p className="text-xs text-slate-400">{a.businessName}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{AD_PLACEMENT_LABELS[a.placement]}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{AD_SIZE_LABELS[a.size].split(" ")[0]}</td>
                    <td className="px-3 py-2 tabular-nums font-bold text-brand">{formatINR(a.price)}</td>
                    <td className="px-3 py-2"><StatusChip s={a.status} /></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{fmtShort(a.startDate)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{fmtShort(a.endDate)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => previewAd(a)} className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">View</button>
                        <button onClick={() => openEdit(a)} className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">Edit</button>
                        {a.status === "ACTIVE" ? (
                          <button onClick={() => setStatus(a, "PAUSED")} className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 hover:bg-yellow-200">Pause</button>
                        ) : (
                          <button onClick={() => setStatus(a, "ACTIVE")} className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 hover:bg-green-200">Activate</button>
                        )}
                        {a.status !== "REJECTED" && (
                          <button onClick={() => setStatus(a, "REJECTED")} className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 hover:bg-orange-200">Reject</button>
                        )}
                        <button onClick={() => removeAd(a)} className="rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Koi ad nahi — “+ Create Advertisement” se shuru karo.</td></tr>
                )}
                {loading && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 && !loading && (
            <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Koi advertisement request nahi. Readers /advertise page se request bhejte hain.
            </p>
          )}
          {requests.map((r) => (
            <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="mr-auto min-w-0">
                  <h3 className="font-bold text-slate-800">
                    {r.name}{r.businessName ? <span className="font-normal text-slate-400"> · {r.businessName}</span> : null}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {r.email}{r.phone ? ` · ${r.phone}` : ""} · {AD_TYPE_LABELS[r.type]} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  r.status === "PENDING_REVIEW" ? "bg-amber-100 text-amber-700" : r.status === "REVIEWED" ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700"
                }`}>
                  {r.status === "PENDING_REVIEW" ? "নতুন রিকোয়েস্ট" : r.status === "REVIEWED" ? "রিভিউ হয়েছে" : "প্রত্যাখ্যাত"}
                </span>
                {r.needsBannerDesign && (
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                    🎨 ব্যানার ডিজাইন লাগবে (+ চার্জ)
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{r.message}</p>
              {r.bannerUrl && (
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">আপলোড করা ব্যানার:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.bannerUrl} alt="Banner" className="max-h-40 rounded-lg border border-slate-200 object-contain" />
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => createFromRequest(r)} className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark">
                  Create Advertisement
                </button>
                {r.status === "PENDING_REVIEW" && (
                  <button onClick={() => updateRequest(r.id, "REVIEWED")} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">
                    Mark Reviewed
                  </button>
                )}
                {r.status !== "REJECTED" && (
                  <button onClick={() => updateRequest(r.id, "REJECTED")} className="rounded border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50">
                    Reject Request
                  </button>
                )}
                <button onClick={() => deleteRequest(r)} className="ml-auto rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "pricing" && <PricingTab rates={rates} reload={loadRates} />}

      {tab === "revenue" && <RevenueDashboard />}
    </div>
  );
}

/* ---------- Rate card tab ---------- */

type DraftRow = Omit<PricingRow, "basePrice"> & { basePrice: string };

function PricingTab({ rates, reload }: { rates: PricingRow[]; reload: () => Promise<void> }) {
  const { toast } = useUI();
  const [draft, setDraft] = useState<DraftRow>({
    type: "HOME_BANNER", placement: "HOME_TOP", size: "MEDIUM", basePrice: "", active: true,
  });
  const [busy, setBusy] = useState(false);

  async function saveRow(row: PricingRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/ads/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...row, basePrice: Number(row.basePrice) }),
      });
      const json = await res.json();
      toast(json.ok ? "Rate saved" : json.error || "Save failed", json.ok ? "success" : "error");
      if (json.ok) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaults() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/ads/pricing?mode=defaults", { method: "POST" });
      const json = await res.json();
      toast(json.ok ? "Default rate card loaded" : "Failed", json.ok ? "success" : "error");
      if (json.ok) await reload();
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm";

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        Rate card se “Calc” button automatically price nikalta hai (base × campaign days). Admin hamesha override kar sakta hai.
      </p>
      {rates.length === 0 ? (
        <button onClick={seedDefaults} disabled={busy} className="mb-4 rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Load Default Rate Card
        </button>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Type</th><th className="px-3 py-2">Placement</th><th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Base ₹/day</th><th className="px-3 py-2">Active</th><th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <RateRow key={`${r.type}-${r.placement}-${r.size}`} row={r} busy={busy} onSave={saveRow} inputCls={inputCls} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.basePrice === "") return toast("Base price bharo", "warning");
          saveRow({ ...draft, basePrice: Number(draft.basePrice) });
          setDraft({ ...draft, basePrice: "" });
        }}
      >
        <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} aria-label="New rate type" className={inputCls}>
          {AD_TYPES.map((t) => <option key={t} value={t}>{AD_TYPE_LABELS[t]}</option>)}
        </select>
        <select value={draft.placement} onChange={(e) => setDraft((d) => ({ ...d, placement: e.target.value }))} aria-label="New rate placement" className={inputCls}>
          {AD_PLACEMENTS.map((p) => <option key={p} value={p}>{AD_PLACEMENT_LABELS[p]}</option>)}
        </select>
        <select value={draft.size} onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))} aria-label="New rate size" className={inputCls}>
          {AD_SIZES.map((s) => <option key={s} value={s}>{AD_SIZE_LABELS[s]}</option>)}
        </select>
        <input value={draft.basePrice} onChange={(e) => setDraft((d) => ({ ...d, basePrice: e.target.value.replace(/[^\d]/g, "") }))} placeholder="Base ₹/day" aria-label="Base price" className={`${inputCls} w-28`} />
        <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700">Add / Update Rate</button>
      </form>
    </div>
  );
}

function RateRow({ row, busy, onSave, inputCls }: {
  row: PricingRow; busy: boolean; onSave: (r: PricingRow) => void; inputCls: string;
}) {
  const [price, setPrice] = useState(String(row.basePrice));
  const [active, setActive] = useState(row.active);
  const dirty = price !== String(row.basePrice) || active !== row.active;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-1.5 text-slate-700">{AD_TYPE_LABELS[row.type]}</td>
      <td className="px-3 py-1.5 text-slate-600">{AD_PLACEMENT_LABELS[row.placement]}</td>
      <td className="px-3 py-1.5 text-slate-600">{AD_SIZE_LABELS[row.size]}</td>
      <td className="w-24 px-3 py-1.5">
        <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} aria-label="Base price" className={inputCls} />
      </td>
      <td className="px-3 py-1.5">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} aria-label="Active" />
      </td>
      <td className="px-3 py-1.5">
        <button
          disabled={!dirty || busy}
          onClick={() => onSave({ ...row, basePrice: Number(price), active })}
          className="rounded bg-brand px-2 py-0.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-30"
        >
          Save
        </button>
      </td>
    </tr>
  );
}

function fmtD(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function fmtShort(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ---------- Save result popup ---------- */

function SavePopup({ ok, message, ad, live }: { ok: boolean; message: string; ad?: Ad; live?: boolean }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            ok ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
          }`}
        >
          {ok ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          )}
        </span>
        <p className={`pt-1 text-sm leading-relaxed ${ok ? "text-slate-700" : "text-slate-700"}`}>{message}</p>
      </div>

      {ok && ad && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
            <dt className="text-slate-400">Name</dt><dd className="truncate font-semibold">{ad.internalName}</dd>
            <dt className="text-slate-400">Advertiser</dt><dd className="truncate">{ad.advertiserName || "—"}</dd>
            <dt className="text-slate-400">Placement</dt><dd>{AD_PLACEMENT_LABELS[ad.placement]}</dd>
            <dt className="text-slate-400">Price</dt><dd className="font-bold text-brand">{formatINR(ad.price)}</dd>
          </dl>
          {live && (
            <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Reader screens refresh automatically — koi page reload ki zarurat nahi.
            </p>
          )}
        </>
      )}

      {!ok && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Your form is still open with all data intact — nothing was lost. Fix the issue and press “Save Advertisement” again.
        </p>
      )}
    </div>
  );
}

export default AdminAds;
export const AdsPanel = AdminAds;
