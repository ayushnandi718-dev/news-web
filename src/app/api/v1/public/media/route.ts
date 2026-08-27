import type { NextRequest } from "next/server";
import { handleError, ok, apiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { saveUpload, isAllowedImage, MAX_UPLOAD_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Public reader-upload endpoint (e.g. obituary photos, news-tip attachments).
 * Requires NO admin auth and does NOT create an admin Media Library record —
 * the uploaded file is simply saved and a /uploads/... URL is returned, which
 * the caller attaches to a PENDING reader submission for later review.
 *
 * Rate-limited to prevent abuse. Admin users should use /api/v1/admin/media
 * (auth-gated, tracked in the Media Library) instead.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`public-media:${ip}`, 10, 300_000)) {
      return apiError("Bahut deri me files bheje gaye — thodi der baad try karo.", 429);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return apiError("No file provided", 422);
    if (!isAllowedImage(file.type)) {
      return apiError("শুধুমাত্র JPEG, PNG, WebP, AVIF বা GIF ফাইল আপলোড করুন।", 415);
    }
    if (file.size > MAX_UPLOAD_BYTES) return apiError("ফাইলের সাইজ ৮ MB-এর বেশি।", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    let saved: { url: string; filePath: string };
    try {
      saved = await saveUpload(buffer, file.type);
    } catch (e) {
      return apiError(e instanceof Error ? e.message : "File processing failed — not a valid image", 415);
    }

    return ok({ url: saved.url }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
