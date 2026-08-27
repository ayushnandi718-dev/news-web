import type { Metadata } from "next";
import { getTrending } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";
import TrendingList from "./TrendingList";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Trending Now",
  description: "Most engaged stories right now — views, shares and comments weighted by recency.",
};

export default async function TrendingPage() {
  const trending = await getTrending({ limit: 20 });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="section-title">Trending Now</h1>
      <p className="mb-4 text-sm text-slate-500">
        Ranked by engagement velocity — popular stories from today and yesterday, independent of the Latest feed.
      </p>
      <TrendingList initialItems={trending.items} hasMore={trending.hasMore} />
    </main>
  );
}
