import Link from "next/link";
import TimeAgo from "./TimeAgo";
import FreshnessBadge from "./FreshnessBadge";
import type { ArticleDTO } from "@/lib/serialize";

export function ArticleCard({ a, variant = "default" }: { a: ArticleDTO; variant?: "default" | "compact" | "hero" }) {
  if (variant === "compact") {
    return (
      <article className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-slate-900 hover:text-brand">
            <Link href={a.url}>{a.title}</Link>
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {a.category && (
              <Link href={`/category/${a.category.slug}`} className="font-medium text-brand hover:underline">
                {a.category.name}
              </Link>
            )}
            <TimeAgo publishedAt={a.publishedAt} showClock />
            <FreshnessBadge publishedAt={a.publishedAt} categorySlug={a.category?.slug} />
          </div>
        </div>
      </article>
    );
  }

  const isHero = variant === "hero";

  if (!isHero) {
    // Feed card: text left, compact thumbnail right — clean on 320–430px.
    return (
      <article className="flex gap-3 border-b border-slate-100 py-3.5 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {a.isBreaking && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Breaking
              </span>
            )}
            {a.category && (
              <Link href={`/category/${a.category.slug}`} className="font-semibold uppercase tracking-wide text-brand hover:underline">
                {a.category.name}
              </Link>
            )}
            <FreshnessBadge publishedAt={a.publishedAt} categorySlug={a.category?.slug} />
          </div>
          <h3 className="mt-1 line-clamp-3 text-[16px] font-bold leading-snug text-slate-900">
            <Link href={a.url} className="hover:text-brand">
              {a.title}
            </Link>
          </h3>
          {a.excerpt && <p className="mt-1 hidden line-clamp-2 text-[13px] leading-relaxed text-slate-600 sm:block">{a.excerpt}</p>}
          <div className="mt-1 text-xs text-slate-500">
            <TimeAgo publishedAt={a.publishedAt} showClock />
            {a.authorName && <span> · {a.authorName}</span>}
          </div>
        </div>
        {a.image && (
          <Link
            href={a.url}
            tabIndex={-1}
            aria-hidden="true"
            className="relative block h-[86px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.image}
              alt=""
              loading="lazy"
              sizes="112px"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </Link>
        )}
      </article>
    );
  }

  return (
    <article>
      {a.image && (
        <Link href={a.url} className="block overflow-hidden rounded-lg bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.image}
            alt=""
            className="aspect-[16/9] w-full object-cover transition group-hover:scale-[1.02]"
            loading="eager"
          />
        </Link>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        {a.isBreaking && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            Breaking
          </span>
        )}
        {a.category && (
          <Link href={`/category/${a.category.slug}`} className="font-semibold uppercase tracking-wide text-brand hover:underline">
            {a.category.name}
          </Link>
        )}
        <FreshnessBadge publishedAt={a.publishedAt} categorySlug={a.category?.slug} />
      </div>
      <h3 className="text-xl font-bold leading-tight text-slate-900 md:text-3xl">
        <Link href={a.url} className="hover:text-brand">
          {a.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.excerpt}</p>
      <div className="mt-1.5 text-xs text-slate-500">
        <TimeAgo publishedAt={a.publishedAt} />
        {a.authorName && <span> · {a.authorName}</span>}
      </div>
    </article>
  );
}
