"use client";

import { useEffect, useState } from "react";
import { ageLabel, formatTime } from "@/lib/format";

export default function TimeAgo({
  publishedAt,
  showClock = true,
}: {
  publishedAt: string | null;
  showClock?: boolean;
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!publishedAt) return;
    const tick = () =>
      setLabel(ageLabel(Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 60_000)));
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [publishedAt]);

  if (!publishedAt) return null;
  return (
    <time dateTime={publishedAt} title={publishedAt}>
      {showClock && <span className="tabular-nums">{formatTime(publishedAt)}</span>}
      {showClock && label && <span className="mx-1">·</span>}
      {label}
    </time>
  );
}
