import type { Metadata } from "next";
import { BRAND, siteUrl } from "@/lib/brand";
import PollsList from "./PollsList";

export const metadata: Metadata = {
  title: `পোল ও সার্ভে — ${BRAND.bn}`,
  description: `${BRAND.bn} - আমাদের সাথে ভোট দিন এবং মতামত জানান`,
  openGraph: { title: `পোল ও সার্ভে — ${BRAND.bn}`, url: `${siteUrl()}/polls` },
};

export const dynamic = "force-dynamic";

export default function PollsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-brand-ink">পোল ও সার্ভে</h1>
      <p className="mb-6 text-sm text-slate-500">আমাদের সাথে ভোট দিন এবং মতামত জানান</p>
      <PollsList />
    </main>
  );
}
