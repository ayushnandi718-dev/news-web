import type { NextRequest } from "next/server";
import { subscribeNews, type NewsEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: NewsEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          if (unsubscribe) unsubscribe();
        }
      };
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));
      unsubscribe = subscribeNews(send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: {"type":"heartbeat"}\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
          if (unsubscribe) unsubscribe();
        }
      }, 25_000);
      req.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
