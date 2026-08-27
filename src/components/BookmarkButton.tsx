"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "dk-bookmarks";

function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function BookmarkButton({ articleId }: { articleId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getBookmarks().includes(articleId));
  }, [articleId]);

  const toggle = useCallback(() => {
    const list = getBookmarks();
    const next = saved ? list.filter((id) => id !== articleId) : [...list, articleId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(!saved);
  }, [saved, articleId]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? "বুকমার্ক সরান" : "বুকমার্ক করুন"}
      className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand active:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? "সংরক্ষিত" : "সংরক্ষণ করুন"}
    </button>
  );
}

export function SavedCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const list = getBookmarks();
      setCount(list.length);
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
