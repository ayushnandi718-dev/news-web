import Link from "next/link";

export default function SectionHeader({
  title,
  href,
  label = "সব দেখুন",
}: {
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between border-b-2 border-brand/90 pb-1">
      <h2 className="flex items-center gap-2 text-[19px] font-bold leading-none text-ink">
        <span className="mb-0.5 h-[18px] w-[3px] bg-brand" aria-hidden="true" />
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="pb-0.5 text-xs font-semibold text-slate-500 transition hover:text-brand"
        >
          {label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
