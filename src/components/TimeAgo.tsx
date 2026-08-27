"use client";
import { useEffect, useState } from "react";
import { formatClockBn, ageLabelBn } from "@/lib/brand";

export default function TimeAgo({
  publishedAt,
  showClock = true,
}: {
  publishedAt: string | null;
  showClock?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [clock, setClock] = useState("");

  useEffect(() => {
    if (!publishedAt) return;
    const tick = () => {
      setLabel(ageLabelBn(Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 60_000)));
      setClock(formatClockBn(publishedAt));
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [publishedAt]);

  if (!publishedAt) return null;
  return (
    <time dateTime={publishedAt} title={publishedAt}>
      {showClock && clock && <span className="tabular-nums">{clock}</span>}
      {showClock && label && <span className="mx-1">·</span>}
      {label}
    </time>
  );
}
