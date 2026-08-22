import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  action,
  accent = false,
}: {
  title: string;
  action?: { label: string; href: string };
  accent?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">
        {accent && <span className="h-3.5 w-1 rounded-full bg-brand" aria-hidden="true" />}
        {title}
      </h2>
      {action && (
        <Link href={action.href} className="text-xs font-semibold text-brand hover:underline">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600 ring-slate-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_REVIEW: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 ring-sky-200",
  SCHEDULED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OLDER: "bg-slate-100 text-slate-500 ring-slate-200",
  ARCHIVED: "bg-slate-100 text-slate-400 ring-slate-200",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

const SCOPE_STYLES: Record<string, string> = {
  LOCAL: "bg-red-50 text-brand-dark ring-red-200",
  REGIONAL: "bg-orange-50 text-orange-700 ring-orange-200",
  STATE: "bg-teal-50 text-teal-700 ring-teal-200",
  NATIONAL: "bg-blue-50 text-blue-700 ring-blue-200",
  INTERNATIONAL: "bg-violet-50 text-violet-700 ring-violet-200",
};

const SCOPE_LABELS: Record<string, string> = {
  LOCAL: "Local",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  INTERNATIONAL: "Intl",
};

export function ScopeBadge({ scope }: { scope?: string | null }) {
  if (!scope) return null;
  const cls = SCOPE_STYLES[scope] ?? SCOPE_STYLES.LOCAL;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${cls}`}>
      {SCOPE_LABELS[scope] ?? scope}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "danger" | "warn" | "good" | "brand";
  href?: string;
}) {
  const toneCls =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "good"
          ? "text-emerald-600"
          : tone === "brand"
            ? "text-brand"
            : "text-slate-900";
  const body = (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition ${
        href ? "hover:border-slate-300 hover:shadow-md" : ""
      }`}
    >
      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-2xl font-black leading-tight tabular-nums ${toneCls}`}>{value}</p>
      {sub != null && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
      {body}
    </Link>
  ) : (
    body
  );
}
