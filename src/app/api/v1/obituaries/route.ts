import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=60, stale-while-revalidate=120";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) + "-" + Date.now().toString(36);
}

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(150).optional(),
  message: z.string().min(5).max(5000),
  photoUrl: z.string().max(500).refine(
    (v) => !v || v.startsWith("/uploads/") || v.startsWith("https://"),
    "Photo URL must be a relative /uploads/ path or https:// URL"
  ).optional(),
  deathDate: z.string().optional(),
  submittedName: z.string().max(200).optional(),
  submittedPhone: z.string().max(20).optional(),
});

export async function GET() {
  const items = await db.obituary.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, data: items }, { headers: { "Cache-Control": CACHE } });
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`obituaries:${ip}`, 5, 600_000)) {
      return NextResponse.json({ ok: false, error: "Rate limit — try again later" }, { status: 429 });
    }
    const body = bodySchema.parse(await req.json());
    const item = await db.obituary.create({
      data: {
        slug: slugify(body.name),
        name: body.name,
        age: body.age,
        message: body.message,
        photoUrl: body.photoUrl,
        deathDate: body.deathDate ? new Date(body.deathDate) : null,
        submittedName: body.submittedName,
        submittedPhone: body.submittedPhone,
        status: "PENDING",
      },
    });
    return NextResponse.json({ ok: true, data: item });
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
