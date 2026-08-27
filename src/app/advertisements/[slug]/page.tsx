import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { BRAND, siteUrl, ogImageUrl } from "@/lib/brand";
import { AD_TYPE_LABELS } from "@/lib/pricing";

export const revalidate = 300;

const getAd = unstable_cache(
  async (slug: string) => {
    return db.advertisement.findUnique({
      where: { slug: decodeSlug(slug) },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        destinationUrl: true,
        type: true,
        advertiserName: true,
        businessName: true,
        phone: true,
      },
    });
  },
  ["advertisements:detail"],
  { revalidate: 300, tags: ["ads"] }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ad = await getAd(slug);
  if (!ad) return { title: "বিজ্ঞাপন পাওয়া যায়নি" };

  const title = `${ad.businessName || ad.title} | বিজ্ঞাপন - ${BRAND.bn}`;
  const description = ad.description
    ? ad.description.replace(/<[^>]+>/g, "").trim().slice(0, 160)
    : `${ad.businessName || ad.title} — ${BRAND.bn}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ad.imageUrl ? [ad.imageUrl] : [ogImageUrl({ title: ad.title })],
      url: `${siteUrl()}/advertisements/${ad.slug}`,
      type: "website",
    },
  };
}

export default async function AdvertisementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ad = await getAd(slug);
  if (!ad) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-brand">হোম</Link>
          <span className="mx-1.5">/</span>
          <Link href="/advertisements" className="hover:text-brand">বিজ্ঞাপন</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">{ad.businessName || ad.title}</span>
        </nav>

        {/* Banner */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {ad.imageUrl ? (
            <div className="relative bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.imageUrl}
                alt={ad.title || ad.businessName || "বিজ্ঞাপন"}
                className="w-full object-contain"
              />
              <span className="absolute left-3 top-3 rounded bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                বিজ্ঞাপন
              </span>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center bg-brand/5">
              <span className="text-5xl font-black text-brand/20">AD</span>
            </div>
          )}

          <div className="p-5 sm:p-8">
            {/* Type badge */}
            <span className="inline-block rounded bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
              {AD_TYPE_LABELS[ad.type] ?? ad.type}
            </span>

            {/* Title */}
            <h1 className="mt-3 text-xl font-black text-ink sm:text-2xl">
              {ad.businessName || ad.title}
            </h1>

            {ad.advertiserName && ad.advertiserName !== ad.businessName && (
              <p className="mt-1 text-sm text-slate-500">by {ad.advertiserName}</p>
            )}

            {/* Description */}
            {ad.description && (
              <div className="mt-6">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  বিবরণ
                </h2>
                <div
                  className="ad-rich text-sm leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: ad.description }}
                />
              </div>
            )}

            {/* Contact info */}
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                যোগাযোগ
              </h2>
              <dl className="space-y-2 text-sm">
                {ad.businessName && (
                  <div className="flex items-center gap-2">
                    <dt className="text-slate-400">প্রতিষ্ঠান</dt>
                    <dd className="font-semibold text-ink">{ad.businessName}</dd>
                  </div>
                )}
                {ad.phone && (
                  <div className="flex items-center gap-2">
                    <dt className="text-slate-400">ফোন</dt>
                    <dd>
                      <a href={`tel:${ad.phone}`} className="font-semibold text-brand hover:underline">
                        {ad.phone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* CTA */}
            {ad.destinationUrl && (
              <div className="mt-6">
                <a
                  href={ad.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
                >
                  ওয়েবসাইটে যান
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            )}

            {/* Branding footer */}
            <p className="mt-8 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
              {BRAND.bn} — আপনার এলাকার খবর, আপনার ভাষায়।
            </p>
          </div>
        </div>
      </main>
  );
}
