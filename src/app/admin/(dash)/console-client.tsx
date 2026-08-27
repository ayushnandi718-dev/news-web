"use client";

import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import { ArticlesPanel } from "./articles/ArticlesPanel";
import { AdsPanel } from "./ads/AdsPanel";
import { MediaPanel } from "./media/MediaPanel";
import { SettingsPanel } from "./settings/SettingsPanel";

interface TabDef {
  id: string;
  label: string;
  permission?: string;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview" },
  { id: "articles", label: "Articles", permission: "article.create" },
  { id: "ads", label: "Ads", permission: "ads.manage" },
  { id: "media", label: "Media", permission: "media.upload" },
  { id: "settings", label: "Settings", permission: "settings.manage" },
];

export interface ConsoleUser {
  name: string;
  role: string;
  permissions?: string[];
}

export default function AdminConsole({ user }: { user: ConsoleUser }) {
  const perms = user.permissions ?? [];
  const visible = TABS.filter((t) => !t.permission || perms.includes(t.permission));
  const [tab, setTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    const h = window.location.hash.replace("#", "");
    return visible.some((t) => t.id === h) ? h : "overview";
  });

  useEffect(() => {
    function onHash() {
      const h = window.location.hash.replace("#", "");
      if (visible.some((t) => t.id === h)) setTab(h);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchTab(id: string) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {visible.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden px-2 text-xs text-slate-400 sm:block">
          Sab kuch ek jagah — {user.role.replace(/_/g, " ").toLowerCase()} view
        </span>
      </div>

      {tab === "overview" && <DashboardClient userName={user.name} />}
      {tab === "articles" && <ArticlesPanel />}
      {tab === "ads" && <AdsPanel />}
      {tab === "media" && <MediaPanel />}
      {tab === "settings" && <SettingsPanel />}
    </div>
  );
}
