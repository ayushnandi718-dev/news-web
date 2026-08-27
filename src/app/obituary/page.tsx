import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { BRAND, siteUrl } from "@/lib/brand";
import ObituarySubmitForm from "./ObituarySubmitForm";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `শোক সংবাদ — ${BRAND.bn}`,
  description: `আলিপুরদুয়ার ও ডুয়ার্সের শোক সংবাদ। ${BRAND.bn}`,
  alternates: { canonical: `${siteUrl()}/obituary` },
};

function bnDate(iso: Date): string {
  return new Intl.DateTimeFormat("bn-IN", { dateStyle: "medium" }).format(iso);
}

const getPublishedObituaries = unstable_cache(
  async () => db.obituary.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 50,
  }),
  ["obituaries:published"],
  { revalidate: 300, tags: ["obituaries"] }
);

export default async function ObituaryPage() {
  const obituaries = await getPublishedObituaries();

  return (
    <main className="mx-auto max-w-[800px] px-4 py-8">
      <h1 className="text-2xl font-bold text-brand">শোক সংবাদ</h1>
      <p className="mt-1 text-sm text-slate-500">প্রিয়জনের স্মরণে শ্রদ্ধা জানানো</p>

      {obituaries.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-400">এখনও কোনো শোক সংবাদ নেই।</p>
      ) : (
        <div className="mt-6 space-y-4">
          {obituaries.map((o) => (
            <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex gap-4">
                {o.photoUrl && (
                  <img src={o.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-brand-ink">{o.name}</h2>
                  {o.age && <p className="text-sm text-slate-500">{o.age} বছর</p>}
                  {o.deathDate && <p className="text-xs text-slate-400">মৃত্যু: {bnDate(o.deathDate)}</p>}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{o.message}</p>
              {o.publishedAt && <p className="mt-2 text-[11px] text-slate-400">প্রকাশ: {bnDate(o.publishedAt)}</p>}
            </div>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-brand-ink">শোক সংবাদ জমা দিন</h2>
        <p className="mt-1 text-xs text-slate-500">আপনার প্রিয়জনের তথ্য দিন। প্রকাশের আগে আমাদের টিম যাচাই করবে।</p>
        <ObituarySubmitForm />
      </section>
    </main>
  );
}
