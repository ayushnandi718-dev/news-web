import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/breaking", label: "Breaking" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/users", label: "Team" },
  { href: "/admin/sources", label: "Sources" },
];

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-black text-brand-ink">Newsroom</span>
          <nav className="flex gap-1 text-sm font-semibold text-slate-600">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded px-3 py-1 hover:bg-slate-100 hover:text-brand">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {session.name} <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold">{session.role}</span>
          </span>
          <LogoutButton />
        </div>
      </div>
      <div className="py-5">{children}</div>
    </div>
  );
}
