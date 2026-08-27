"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "dk-pwa-installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }
    } catch {
      // user cancelled or error
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-brand/20 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)] sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border sm:border-slate-200">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
          DK
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-ink">দুয়ারসের খবর ইনস্টল করুন</p>
          <p className="mt-0.5 text-xs text-slate-500">
            দ্রুত খবর পেতে আপনার ফোনে অ্যাপটি যোগ করুন। Breaking News-এর আপডেট পান।
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={install}
              disabled={installing}
              className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {installing ? "ইনস্টল হচ্ছে..." : "ইনস্টল করুন"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-600"
            >
              পরে
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Close"
          className="shrink-0 rounded p-1 text-slate-300 transition hover:text-slate-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
