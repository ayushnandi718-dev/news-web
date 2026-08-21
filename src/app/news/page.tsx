import type { Metadata } from "next";
import { getLatest } from "@/lib/feeds";
import LiveFeed from "@/components/LiveFeed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest News",
  description: "The freshest stories, updated in real time.",
};

export default async function LatestPage() {
  const latest = await getLatest({ limit: 20 });
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="section-title">Latest News</h1>
      <LiveFeed initialItems={latest.items} initialCursor={latest.next_cursor} />
    </main>
  );
}
