import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import AdvertiseContactForm from "./AdvertiseContactForm";
import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { getContactSettings } from "@/lib/settings";
import {
  AD_TYPES,
  AD_TYPE_LABELS,
  AD_SIZES,
  AD_SIZE_LABELS,
  formatINR,
} from "@/lib/pricing";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `বিজ্ঞাপন দিন — ${BRAND.bn}`,
  description: `${BRAND.bn}-এ বিজ্ঞাপন দিয়ে আলিপুরদুয়ার, ডুয়ার্স ও উত্তরবঙ্গের হাজারো বাংলা পাঠকের কাছে আপনার ব্যবসা পৌঁছান।`,
};

const AD_OPTIONS = [
  {
    title: "হোমপেজ ব্যানার",
    detail:
      "সাইটের হোমপেজে সবচেয়ে প্রথম নজরে পড়ে — টপ লিডারবোর্ড বা সাইডবক্স। সর্বোচ্চ ভিউ পেতে সেরা জায়গা।",
  },
  {
    title: "বিভাগ পেজ ব্যানার",
    detail:
      "আলিপুরদুয়ার, খেলা, বিনোদন বা আপনার পছন্দের বিভাগের পেজে ব্যানার — সংশ্লিষ্ট পাঠক সরাসরি পাবেন।",
  },
  {
    title: "স্পনসর্ড সংবাদ",
    detail:
      "আপনার ব্যবসা, অফার বা ঘটনাকে একটি পূর্ণাঙ্গ সংবাদ আকারে আমাদের এডিটরিয়াল টিম লিখে প্রকাশ করবে।",
  },
  {
    title: "ব্রেকিং টিকার",
    detail:
      "উপরের চলমান ব্রেকিং টিকারে আপনার ছোট বার্তা — প্রতিটি পেজে বারবার চোখে পড়বে।",
  },
  {
    title: "লাইভ স্ট্রিম স্পনসরশিপ",
    detail:
      "আমাদের লাইভ নিউজ স্ট্রিমের শুরুতে/সময়ে আপনার বিজ্ঞাপন — লাইভ দর্শকদের কাছে সরাসরি।",
  },
  {
    title: "সোশ্যাল মিডিয়া প্রমোশন",
    detail:
      "ফেসবুক, ইউটিউব ও WhatsApp চ্যানেলে আপনার বিজ্ঞাপন শেয়ার — সাথে সাইটেও দেখা যাবে।",
  },
];

const STEPS = [
  { n: "১", t: "যোগাযোগ করুন", d: "নিচের ফর্ম বা ফোন দিয়ে জানান কী ধরনের বিজ্ঞাপন চান।" },
  { n: "২", t: "প্ল্যান ঠিক করুন", d: "জায়গা, সময় ও রেট নিয়ে কথা বসিয়ে চূড়ান্ত প্ল্যান বানানো হবে।" },
  { n: "৩", t: "ডিজাইন / কনটেন্ট", d: "আপনার ব্যানার বা লেখা না থাকলে আমরাও বানিয়ে দিতে পারি।" },
  { n: "৪", t: "লাইভ!", d: "তারিখ ঠিক হলেই আপনার বিজ্ঞাপন সাইটে চালু হয়ে যাবে।" },
];

const getActivePricing = unstable_cache(
  async () => db.advertisementPricing.findMany({ where: { active: true } }),
  ["advertise:pricing"],
  { revalidate: 3600, tags: ["ads:pricing"] }
);

export default async function AdvertisePage() {
  const s = await getContactSettings();
  const email = s.contactEmail;
  const phone = s.contactPhone;

  let startingPrices: Record<string, number> = {};
  try {
    const rows = await getActivePricing();
    for (const t of AD_TYPES) {
      const prices = rows.filter((r) => r.type === t).map((r) => r.basePrice);
      if (prices.length) startingPrices[t] = Math.min(...prices);
    }
  } catch {}

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero */}
      <nav aria-label="ব্রেডক্রাম্ব" className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-brand">হোম</Link>
        <span aria-hidden> / </span>
        <span className="text-slate-600">বিজ্ঞাপন দিন</span>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand">Advertisement</p>
        <h1 className="mt-1 text-2xl font-black leading-snug text-brand-ink sm:text-3xl">
          আপনার ব্যবসার খবর পৌঁছে দিন হাজারো পাঠকের হাতে
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {BRAND.bn} প্রতিদিন আলিপুরদুয়ার, ডুয়ার্স ও উত্তরবঙ্গের পাঠকদের কাছে নির্ভরযোগ্য বাংলা
          সংবাদ পৌঁছে দেয়। এখানে বিজ্ঞাপন দিলে আপনার কথা পৌঁছায় সেই মানুষদের কাছেই — যারা
          স্থানীয়ভাবে কেনাকাটা ও সেবা নেন।
        </p>
      </section>

      {/* Ad options */}
      <section className="mt-8" aria-label="বিজ্ঞাপনের ধরন">
        <h2 className="border-b-2 border-brand pb-1 text-lg font-black text-brand-ink">
          কী কী ধরনের বিজ্ঞাপন দিতে পারবেন?
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AD_OPTIONS.map((o) => (
            <article key={o.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand/50 hover:shadow-sm">
              <h3 className="text-[15px] font-bold text-brand">{o.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-600">{o.detail}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          রেট বিজ্ঞাপনের জায়গা, সাইজ ও দিনের সংখ্যা অনুযায়ী হিসাব হয় — নিচে শুরুর দাম দেওয়া আছে।
        </p>
      </section>

      {/* Sizes + starting pricing */}
      <section className="mt-8" aria-label="বিজ্ঞাপনের সাইজ ও শুরুর দাম">
        <h2 className="border-b-2 border-brand pb-1 text-lg font-black text-brand-ink">
          সাইজ ও শুরুর দাম
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AD_SIZES.map((s) => (
            <article key={s} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-sm font-bold text-brand-ink">{AD_SIZE_LABELS[s]}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {s === "SMALL" && "সাইডবার ও ছোট জায়গার জন্য"}
                {s === "MEDIUM" && "টপ ব্যানারের জন্য আদর্শ"}
                {s === "LARGE" && "বড় বিলবোর্ড স্টাইল"}
                {s === "FULL_WIDTH" && "পুরো প্রস্থ জুড়ে"}
              </p>
            </article>
          ))}
        </div>
        {Object.keys(startingPrices).length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">বিজ্ঞাপনের ধরন</th>
                  <th className="px-3 py-2 text-right">শুরু</th>
                </tr>
              </thead>
              <tbody>
                {AD_TYPES.filter((t) => startingPrices[t]).map((t) => (
                  <tr key={t} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-700">{AD_TYPE_LABELS[t]}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-brand">
                      {formatINR(startingPrices[t])}<span className="text-[10px] font-medium text-slate-400">/দিন থেকে</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            রেট কার্ড শীঘ্রই আপডেট হচ্ছে — বিস্তারিত জানতে নিচে অনুরোধ পাঠান।
          </p>
        )}
      </section>

      {/* Process */}
      <section className="mt-8" aria-label="বিজ্ঞাপন দেওয়ার প্রক্রিয়া">
        <h2 className="border-b-2 border-brand pb-1 text-lg font-black text-brand-ink">
          যেভাবে শুরু করবেন
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                {s.n}
              </span>
              <p className="mt-2 text-sm font-bold text-brand-ink">{s.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Contact CTA */}
      <section className="mt-10" id="contact" aria-label="বিজ্ঞাপনের জন্য যোগাযোগ">
        <div className="rounded-xl border-2 border-brand bg-gradient-to-b from-brand/5 to-transparent p-6 sm:p-8">
          <h2 className="text-center text-xl font-black leading-snug text-brand-ink sm:text-2xl">
            আপনার বিজ্ঞাপন দেওয়ার জন্য যোগাযোগ করুন
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-600">
            নিচের ফর্ম পূরণ করুন — আমরা দ্রুত যোগাযোগ করব। সরাসরি কথা বলতে চাইলে ফোন বা
            WhatsApp-ও করতে পারেন।
          </p>

          <div className="mx-auto mt-5 grid max-w-md gap-2 sm:max-w-none sm:grid-cols-2">
            <a
              href={`mailto:${email}`}
              className="flex min-h-[52px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition hover:border-brand"
            >
              <span aria-hidden className="text-lg">✉️</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">ইমেল</span>
                <span className="block truncate text-sm font-semibold text-brand-ink">{email}</span>
              </span>
            </a>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex min-h-[52px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition hover:border-brand"
              >
                <span aria-hidden className="text-lg">📞</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">ফোন / WhatsApp</span>
                  <span className="block truncate text-sm font-semibold text-brand-ink">{phone}</span>
                </span>
              </a>
            ) : (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent("ফোনে যোগাযোগের অনুরোধ")}`}
                className="flex min-h-[52px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition hover:border-brand"
              >
                <span aria-hidden className="text-lg">📞</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">কলব্যাক</span>
                  <span className="block truncate text-sm font-semibold text-brand-ink">নম্বরের জন্য ইমেল করুন</span>
                </span>
              </a>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <AdvertiseContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
