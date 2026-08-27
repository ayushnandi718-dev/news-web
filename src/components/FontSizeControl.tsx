"use client";

import { useTheme } from "./ThemeProvider";

export default function FontSizeControl() {
  const { fontSize, setFontSize } = useTheme();
  return (
    <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="ফন্ট সাইজ">
      <button
        onClick={() => setFontSize(fontSize - 1)}
        disabled={fontSize <= 12}
        aria-label="ছোট করুন"
        className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-brand disabled:opacity-30"
      >
        A-
      </button>
      <span className="min-w-[20px] text-center text-[10px] font-semibold text-slate-400 tabular-nums">{fontSize}</span>
      <button
        onClick={() => setFontSize(fontSize + 1)}
        disabled={fontSize >= 24}
        aria-label="বড় করুন"
        className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-brand disabled:opacity-30"
      >
        A+
      </button>
    </div>
  );
}
