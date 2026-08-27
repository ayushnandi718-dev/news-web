import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { advertiseRequestSchema } from "@/lib/validation";
import { handleError, ok, apiError } from "@/lib/api";
import { saveUpload, isAllowedImage, MAX_UPLOAD_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/**
 * Reader advertisement request. Creates a PENDING_REVIEW record for the
 * admin Ads Manager — nothing is published automatically.
 * Accepts multipart/form-data with optional banner image file.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (rateLimited(ip)) {
      return apiError("Bahur deri me kai requests bheje gaye — thodi der baad try karo.", 429);
    }

    const formData = await req.formData();
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") data[key] = value;
    }

    const body = advertiseRequestSchema.parse(data);
    if (body.website) return apiError("Spam detected", 400);

    let bannerUrl: string | null = null;
    const file = formData.get("banner");
    if (file && file instanceof File && file.size > 0) {
      if (!isAllowedImage(file.type)) {
        return apiError("শুধুমাত্র JPEG, PNG, WebP, AVIF, GIF ফাইল আপলোড করুন।", 400);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return apiError("ফাইলের সাইজ ৮ MB-এর বেশি।", 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await saveUpload(buffer, file.type);
      bannerUrl = url;
    }

    const item = await db.advertisementRequest.create({
      data: {
        name: body.name,
        businessName: body.businessName || null,
        email: body.email,
        phone: body.phone || null,
        type: body.type,
        message: body.message,
        bannerUrl,
        needsBannerDesign: body.needsBannerDesign,
      },
    });
    return ok({ request: { id: item.id } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
