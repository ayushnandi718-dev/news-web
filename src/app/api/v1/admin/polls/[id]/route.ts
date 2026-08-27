import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { pollUpdateSchema } from "@/lib/validation";
import { slugify } from "@/lib/text";
import { ok, handleError } from "@/lib/api";
import { publishEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("poll.create");
    const { id } = await params;
    const poll = await db.poll.findUnique({ where: { id } });
    if (!poll) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return ok(poll);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("poll.edit");
    const { id } = await params;
    const body = pollUpdateSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (body.question !== undefined) data.question = body.question;
    if (body.description !== undefined) data.description = body.description;
    if (body.options !== undefined) data.options = body.options;
    if (body.status !== undefined) data.status = body.status;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt;
    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      const existing = await db.poll.findFirst({ where: { slug, NOT: { id } } });
      if (existing) return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
      data.slug = slug;
    }
    const poll = await db.poll.update({ where: { id }, data });
    publishEvent({ type: "poll.updated" });
    return ok(poll);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("poll.delete");
    const { id } = await params;
    await db.poll.delete({ where: { id } });
    publishEvent({ type: "poll.updated" });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
