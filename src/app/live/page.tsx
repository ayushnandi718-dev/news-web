import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { PLATFORM_LABELS, type LivePlatform } from "@/lib/live";
import { BRAND } from "@/lib/brand";

export const revalidate = 10;

export const metadata: Metadata = {
  title: "লাইভ",
  description: `${BRAND.bn} — সরাসরি লাইভ সংবাদ কভারেজ।`,
};

interface LiveItem {
  id: string;
  title: string;
  url: string;
  bannerUrl: string | null;
  platform: string;
}

const getActiveStreams = unstable_cache(
  async () => db.liveStream.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, url: true, bannerUrl: true, platform: true },
  }),
  ["live:active-streams"],
  { revalidate: 10, tags: ["live-streams"] }
);

export default async function LivePage() {
  const items = await getActiveStreams();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
        </span>
        <h1 className="section-title mb-0">লাইভ</h1>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          এই মুহূর্তে কোনো লাইভ সম্প্রচার চলছে না।
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={item.id}>
              <LiveCard item={item} featured={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function platformBadgeClass(platform: string): string {
  switch (platform as LivePlatform) {
    case "FACEBOOK":
      return "bg-[#1877F2]";
    case "YOUTUBE":
      return "bg-[#FF0000]";
    default:
      return "bg-slate-800";
  }
}

function LiveCard({ item, featured }: { item: LiveItem; featured: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand hover:shadow-md"
    >
      <div className={`relative ${featured ? "aspect-video" : "aspect-[21/9]"} w-full overflow-hidden bg-gradient-to-br from-slate-800 via-brand-dark to-slate-900`}>
        {item.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.bannerUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading={featured ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
            <span className="text-sm font-bold tracking-wide">সরাসরি সম্প্রচার</span>
          </div>
        )}
        {/* LIVE pulse badge */}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow">
          <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-white" aria-hidden="true" />
          লাইভ
        </span>
        {/* Platform tag */}
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow ${platformBadgeClass(item.platform)}`}>
          {PLATFORM_LABELS[item.platform as LivePlatform] ?? PLATFORM_LABELS.OTHER}
        </span>
        {/* Play hint */}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="rounded-full bg-black/55 p-4 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
      </div>
      <div className="p-3">
        <p className="font-bold leading-snug text-brand-ink group-hover:text-brand">{item.title}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          দেখতে ট্যাপ করুন — {PLATFORM_LABELS[item.platform as LivePlatform] ?? PLATFORM_LABELS.OTHER}-এ খুলবে
        </p>
      </div>
    </a>
  );
}
