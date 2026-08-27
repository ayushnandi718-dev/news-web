import type { Metadata } from "next";
import { BRAND, siteUrl } from "@/lib/brand";
import GalleryList from "./GalleryList";

export const metadata: Metadata = {
  title: `ফটো গ্যালারি — ${BRAND.bn}`,
  description: `${BRAND.bn} - স্থানীয় ইভেন্ট, উৎসব ও সংবাদের ছবির সংকলন`,
  openGraph: { title: `ফটো গ্যালারি — ${BRAND.bn}`, url: `${siteUrl()}/gallery` },
};

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-brand-ink">ফটো গ্যালারি</h1>
      <p className="mb-6 text-sm text-slate-500">স্থানীয় ইভেন্ট, উৎসব ও সংবাদের ছবি</p>
      <GalleryList />
    </main>
  );
}
