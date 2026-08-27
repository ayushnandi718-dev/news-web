import Link from "next/link";
import TimeAgo from "./TimeAgo";
import type { ArticleDTO } from "@/lib/serialize";
import { bnLabel } from "@/lib/brand";

export default function TrendingList({
  items,
  max = 5,
}: {
  items: ArticleDTO[];
  max?: number;
}) {
  const slice = items.slice(0, max);
  if (slice.length === 0) {
    return <p className="py-4 text-sm text-slate-500">এখনও কিছু ট্রেন্ড করছে না।</p>;
  }
  return (
    <ol className="divide-y divide-slate-200/70 border border-slate-200/80 bg-white">
      {slice.map((a, i) => (
        <li key={a.id} className="flex gap-3 px-3 py-3 transition-colors hover:bg-[#faf8f2]">
          <span
            className="w-7 shrink-0 text-right text-xl font-bold leading-none text-brand/25 tabular-nums"
            aria-hidden="true"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
              <Link href={a.url} className="hover:text-brand">
                {a.title}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              {a.category && (
                <span className="font-medium text-brand">{bnLabel(a.category.slug, a.category.name)}</span>
              )}
              <span>·</span>
              <TimeAgo publishedAt={a.publishedAt} />
              <span>·</span>
              <span>{a.views.toLocaleString("bn-IN")} বার পঠিত</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
