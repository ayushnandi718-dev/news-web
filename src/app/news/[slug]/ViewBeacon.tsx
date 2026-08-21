"use client";

import { useEffect } from "react";

export default function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/v1/news/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}
