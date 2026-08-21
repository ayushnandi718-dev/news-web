"use client";

import { useState } from "react";

export default function ShareButtons({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/news/${slug}` : `/news/${slug}`;

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

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold text-slate-500">Share:</span>
      <button
        onClick={() => open("twitter", `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)}
        className="rounded border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 hover:border-brand hover:text-brand"
      >
        X
      </button>
      <button
        onClick={() => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}
        className="rounded border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 hover:border-brand hover:text-brand"
      >
        Facebook
      </button>
      <button
        onClick={() => open("whatsapp", `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`)}
        className="rounded border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 hover:border-brand hover:text-brand"
      >
        WhatsApp
      </button>
      <button
        onClick={copy}
        className="rounded border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 hover:border-brand hover:text-brand"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
