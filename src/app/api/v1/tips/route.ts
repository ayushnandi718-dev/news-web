import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  message: z.string().min(5).max(5000),
  imageUrl: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`tips:${ip}`, 5, 600_000)) {
      return NextResponse.json({ ok: false, error: "Rate limit — try again later" }, { status: 429 });
    }
    const body = bodySchema.parse(await req.json());
    const item = await db.newsTip.create({
      data: {
        name: body.name,
        phone: body.phone,
        message: body.message,
        imageUrl: body.imageUrl,
        status: "PENDING",
      },
    });
    return NextResponse.json({ ok: true, data: item });
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : "Invalid request";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
