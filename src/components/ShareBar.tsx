"use client";

import { useState } from "react";

export default function ShareBar({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/news/${slug}` : `/news/${slug}`;
  const encodedText = typeof window !== "undefined" ? encodeURIComponent(`${title}\n\n${url}`) : "";

  function track(channel: string) {
    fetch(`/api/v1/news/${slug}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
    }).catch(() => {});
  }

  function open(channel: string, href: string) {
    track(channel);
    window.open(href, "_blank", "noopener,width=600,height=500");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("copy");
    } catch {}
  }

  const btn =
    "flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand active:bg-slate-100";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">শেয়ার</span>
      <button
        type="button"
        onClick={() => open("whatsapp", `https://wa.me/?text=${encodedText}`)}
        className={`${btn} hover:border-emerald-500 hover:text-emerald-600`}
        aria-label="WhatsApp-এ শেয়ার করুন"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.8l.4-.5c.1-.2.1-.3 0-.5L9 7.6c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.1-.3 3.6a11 11 0 0 0 4.2 4.3c1.6.9 2.7 1 3.6.8.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.9-.7Z" />
        </svg>
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}
        className={btn}
        aria-label="Facebook-এ শেয়ার করুন"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M14 8h3V5h-3a4 4 0 0 0-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9a1 1 0 0 1 1-1Z" />
        </svg>
        Facebook
      </button>
      <button
        type="button"
        onClick={() => open("twitter", `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)}
        className={btn}
        aria-label="X-এ শেয়ার করুন"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M17.7 3H21l-7.3 8.3L22.2 21h-6.7l-5.3-6.2L4.2 21H1l7.8-8.9L1.5 3h6.9l4.8 5.7L17.7 3Zm-1.2 16h1.9L7 4.9H5L16.5 19Z" />
        </svg>
        X
      </button>
      <button type="button" onClick={copy} className={btn} aria-label="লিংক কপি করুন">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
        {copied ? "কপি হয়েছে!" : "লিংক কপি"}
      </button>
    </div>
  );
}
