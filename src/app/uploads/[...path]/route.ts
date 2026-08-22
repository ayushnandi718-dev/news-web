import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

const SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0 || segments.some((s) => !SEGMENT_RE.test(s))) {
    return new Response("Not found", { status: 404 });
  }
  const filePath = path.join(UPLOAD_DIR, ...segments);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
