import Link from "next/link";
import SafeImage from "./SafeImage";
import TimeAgo from "./TimeAgo";
import FreshnessBadge from "./FreshnessBadge";
import type { ArticleDTO } from "@/lib/serialize";
import { bnLabel } from "@/lib/brand";

type Variant = "hero" | "lead" | "grid" | "compact" | "text";

function Badges({ a }: { a: ArticleDTO }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {a.breakingActive && (
        <span className="bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">ব্রেকিং</span>
      )}
      {a.category && (
        <Link
          href={`/category/${a.category.slug}`}
          className="font-bold text-brand hover:underline"
        >
          {bnLabel(a.category.slug, a.category.name)}
        </Link>
      )}
      <FreshnessBadge publishedAt={a.publishedAt} categorySlug={a.category?.slug} />
    </div>
  );
}

function Meta({ a }: { a: ArticleDTO }) {
  return (
    <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
      <TimeAgo publishedAt={a.publishedAt} />
      {a.authorName && <span className="truncate">· {a.authorName}</span>}
    </p>
  );
}

export default function NewsCard({ a, variant = "lead" }: { a: ArticleDTO; variant?: Variant }) {
  if (variant === "compact") {
    return (
      <article className="flex gap-3 border-b border-slate-200/70 py-3 last:border-b-0">
        <div className="min-w-0 flex-1">
          <Badges a={a} />
          <h3 className="mt-1 line-clamp-3 text-[15px] font-semibold leading-snug text-ink">
            <Link href={a.url} className="hover:text-brand">
              {a.title}
            </Link>
          </h3>
          <Meta a={a} />
        </div>
        <Link
          href={a.url}
          className="relative block h-[72px] w-[96px] shrink-0 overflow-hidden bg-slate-100"
          tabIndex={-1}
          aria-hidden="true"
        >
          <SafeImage src={a.image} alt="" sizes="96px" compact />
        </Link>
      </article>
    );
  }

  if (variant === "text") {
    return (
      <article className="border-b border-slate-200/70 py-2.5 last:border-b-0">
        <Badges a={a} />
        <h3 className="mt-1 text-sm font-semibold leading-snug text-ink">
          <Link href={a.url} className="hover:text-brand">
            {a.title}
          </Link>
        </h3>
        <Meta a={a} />
      </article>
    );
  }

  if (variant === "grid") {
    return (
      <article className="group border border-slate-200/80 bg-white">
        <Link href={a.url} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
          <SafeImage
            src={a.image}
            alt=""
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition duration-300 group-hover:scale-[1.02]"
          />
        </Link>
        <div className="p-2.5">
          <Badges a={a} />
          <h3 className="mt-1.5 line-clamp-3 text-[15px] font-bold leading-snug text-ink group-hover:text-brand">
            <Link href={a.url}>{a.title}</Link>
          </h3>
          <Meta a={a} />
        </div>
      </article>
    );
  }

  // "lead" — section main card; "hero" — homepage top story
  const isHero = variant === "hero";
  return (
    <article className="group min-w-0">
      <Link
        href={a.url}
        className={`relative block w-full overflow-hidden bg-slate-100 ${isHero ? "aspect-[16/9]" : "aspect-[16/10]"}`}
      >
        <SafeImage
          src={a.image}
          alt=""
          priority={isHero}
          sizes={isHero ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 768px) 100vw, 40vw"}
          className="transition duration-300 group-hover:scale-[1.015]"
        />
      </Link>
      <div className="mt-2.5">
        <Badges a={a} />
        <h3
          className={`mt-1 font-bold leading-snug text-ink group-hover:text-brand ${
            isHero ? "[font-size:clamp(1.45rem,2.6vw,2.15rem)] [line-height:1.25]" : "text-xl md:text-[22px]"
          }`}
        >
          <Link href={a.url}>{a.title}</Link>
        </h3>
        {a.excerpt && (
          <p className={`mt-1.5 text-slate-600 ${isHero ? "line-clamp-3 text-[15px]" : "line-clamp-2 text-sm"}`}>
            {a.excerpt}
          </p>
        )}
        <Meta a={a} />
      </div>
    </article>
  );
}
