import type { ReactNode } from "react";
import Link from "next/link";

/** Shared shell for static editorial pages (advertise, legal, contact…). */
export default function StaticPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="ব্রেডক্রাম্ব" className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-brand">হোম</Link>
        <span aria-hidden> / </span>
        <span className="text-slate-600">{title}</span>
      </nav>
      <h1 className="border-b-2 border-brand pb-2 text-2xl font-black leading-snug text-brand-ink sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 border-l-4 border-brand/60 pl-3 font-semibold leading-relaxed text-slate-700">
          {subtitle}
        </p>
      )}
      <div className="article-body mt-5 space-y-3 text-[15px] leading-relaxed text-slate-800">{children}</div>
    </main>
  );
}
