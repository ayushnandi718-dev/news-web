"use client";

import { useEffect } from "react";
import { trackArticleView } from "@/components/ContinueReading";

export default function ViewBeacon({
  slug,
  title,
  category,
  image,
}: {
  slug: string;
  title: string;
  category?: string;
  image?: string;
}) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/v1/news/${slug}/view`, { method: "POST" }).catch(() => {});
    trackArticleView(slug, title, category, image);
  }, [slug, title, category, image]);
  return null;
}
