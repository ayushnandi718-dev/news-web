import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, siteUrl } from "@/lib/brand";
import { db } from "@/lib/db";
import GalleryDetail from "./GalleryDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await db.gallery.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!gallery) return { title: "Not Found" };
  return {
    title: `${gallery.title} — ফটো গ্যালারি — ${BRAND.bn}`,
    description: gallery.description || `${gallery.title} - ${BRAND.bn} ফটো গ্যালারি`,
    openGraph: { title: gallery.title, description: gallery.description || "", images: gallery.coverImage ? [gallery.coverImage] : [] },
  };
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gallery = await db.gallery.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!gallery) notFound();
  return <GalleryDetail gallery={JSON.parse(JSON.stringify(gallery))} />;
}
