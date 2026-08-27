import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { BRAND, siteUrl } from "@/lib/brand";
import { AD_TYPES, AD_TYPE_LABELS } from "@/lib/pricing";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `বিজ্ঞাপন | ${BRAND.bn}`,
  description: `${BRAND.bn}-এ বিজ্ঞাপন দিন। আপনার ব্যবসার প্রচার করুন আমাদের পাঠকদের কাছে।`,
  openGraph: { title: `বিজ্ঞাপন | ${BRAND.bn}`, url: `${siteUrl()}/advertisements` },
};

const getActiveAds = unstable_cache(
  async () => {
    const ads = await db.advertisement.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        type: true,
        advertiserName: true,
        businessName: true,
        price: true,
        impressions: true,
      },
    });

    // Weighted priority sort (price-based with rotation, server-side only)
    const scored = ads.map((ad) => ({
      ...ad,
      _score: (ad.price * 10) - (ad.impressions * 0.01) + (Math.random() * ad.price * 0.05),
    }));
    scored.sort((a, b) => b._score - a._score);

    return scored.map(({ _score, price, impressions, ...pub }) => pub);
  },
  ["advertisements:listing"],
  { revalidate: 300, tags: ["ads"] }
);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim().slice(0, 140);
}

export default async function AdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const allAds = await getActiveAds();
  const filtered = category ? allAds.filter((a) => a.type === category) : allAds;

  const categories = AD_TYPES.map((t) => ({
    value: t,
    label: AD_TYPE_LABELS[t],
    count: allAds.filter((a) => a.type === t).length,
  })).filter((c) => c.count > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <span className="inline-block rounded bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            বিজ্ঞাপন
          </span>
          <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">
            আমাদের বিজ্ঞাপনদাতারা
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            আপনার এলাকার প্রতিষ্ঠান ও ব্যবসাগুলোকে চিনুন
          </p>
        </div>

        {/* Category filter tabs */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/advertisements"
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                !category ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              সব ({allAds.length})
            </Link>
            {categories.map((c) => (
              <Link
                key={c.value}
                href={`/advertisements?category=${c.value}`}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  category === c.value ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label} ({c.count})
              </Link>
            ))}
          </div>
        )}

        {/* Ad grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-lg font-bold text-slate-400">কোনো বিজ্ঞাপন নেই</p>
            <p className="mt-1 text-sm text-slate-400">
              এই মুহূর্তে কোনো সক্রিয় বিজ্ঞাপন নেই।
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ad) => (
              <Link
                key={ad.id}
                href={`/advertisements/${ad.slug}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
              >
                {ad.imageUrl ? (
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ad.imageUrl}
                      alt={ad.title || ad.businessName || "বিজ্ঞাপন"}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute left-2 top-2 rounded bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      বিজ্ঞাপন
                    </span>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-brand/5">
                    <span className="text-4xl font-black text-brand/20">AD</span>
                  </div>
                )}
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand">
                    {AD_TYPE_LABELS[ad.type] ?? ad.type}
                  </p>
                  <h2 className="mt-1 text-base font-bold text-ink line-clamp-2 group-hover:text-brand">
                    {ad.businessName || ad.title || "বিজ্ঞাপন"}
                  </h2>
                  {ad.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {stripHtml(ad.description)}
                    </p>
                  )}
                  {ad.advertiserName && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      by {ad.advertiserName}
                    </p>
                  )}
                  <span className="mt-3 inline-block text-xs font-semibold text-brand group-hover:underline">
                    বিস্তারিত দেখুন →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
  );
}
