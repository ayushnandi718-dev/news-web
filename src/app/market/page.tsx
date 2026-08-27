import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import MarketWatch from "@/components/MarketWatch";

export const metadata: Metadata = {
  title: "মার্কেট আপডেট",
  description: "শেয়ার বাজার, সোনা-রূপোসহ আজকের মার্কেট আপডেট।",
};

export const revalidate = 300;

export default function MarketPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="border-b-2 border-brand pb-2 text-2xl font-black leading-snug text-brand-ink sm:text-3xl">
        মার্কেট আপডেট
      </h1>
      <div className="mt-5">
        <MarketWatch />
      </div>
    </main>
  );
}
