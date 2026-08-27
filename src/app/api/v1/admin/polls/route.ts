import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { pollCreateSchema } from "@/lib/validation";
import { slugify } from "@/lib/text";
import { ok, handleError } from "@/lib/api";
import { publishEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requirePerm("poll.create");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where = status && status !== "ALL" ? { status } : {};
    const items = await db.poll.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePerm("poll.create");
    const body = pollCreateSchema.parse(await req.json());
    const slug = body.slug || slugify(body.question.slice(0, 80));
    const existing = await db.poll.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    }
    const poll = await db.poll.create({
      data: {
        question: body.question,
        slug,
        description: body.description,
        options: body.options.map((o) => ({ ...o, votes: 0 })),
        status: body.status,
        expiresAt: body.expiresAt,
      },
    });
    publishEvent({ type: "poll.updated" });
    return ok(poll);
  } catch (e) {
    return handleError(e);
  }
}
