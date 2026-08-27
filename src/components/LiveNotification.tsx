"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useActiveLive } from "@/hooks/useActiveLive";

/**
 * Floating "We are live" notification banner.
 * Shows when any live stream is active, auto-dismisses after 30s.
 * Like a WhatsApp notification bubble — attention-grabbing but dismissible.
 */
export default function LiveNotification() {
  const { hasActive } = useActiveLive();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasActive && !dismissed) {
      // Small delay so it doesn't flash on page load
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [hasActive, dismissed]);

  // Auto-dismiss after 30s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      setDismissed(true);
    }, 30_000);
    return () => clearTimeout(t);
  }, [visible]);

  // Reset dismissed when live goes off and comes back
  useEffect(() => {
    if (!hasActive) setDismissed(false);
  }, [hasActive]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex justify-center px-3 pt-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-red-600 px-4 py-2.5 shadow-2xl shadow-red-600/30 animate-slideDown max-w-md w-full">
        {/* Pulsing dot */}
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>

        {/* Text */}
        <Link href="/live" className="flex-1 min-w-0" onClick={() => setVisible(false)}>
          <p className="text-sm font-black text-white leading-tight">
            আমরা লাইভ!
          </p>
          <p className="text-[11px] font-medium text-red-100 leading-tight">
            সরাসরি সম্প্রচার চলছে — এখনই দেখুন
          </p>
        </Link>

        {/* CTA */}
        <Link
          href="/live"
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-50"
        >
          দেখুন
        </Link>

        {/* Close */}
        <button
          onClick={() => { setVisible(false); setDismissed(true); }}
          aria-label="বন্ধ করুন"
          className="shrink-0 rounded-lg p-1 text-red-200 transition hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
