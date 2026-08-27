import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { pollVoteSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, handleError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function fingerprint(req: Request, ip: string): string {
  const ua = req.headers.get("user-agent") || "";
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 32);
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeSlug(rawSlug);
    const ip = clientIp(req);
    if (!rateLimit(`poll:${ip}`, 10, 300_000)) {
      return NextResponse.json({ ok: false, error: "Rate limit — try again later" }, { status: 429 });
    }
    const poll = await db.poll.findFirst({ where: { slug } });
    if (!poll) return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
    if (poll.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Poll is not active" }, { status: 400 });
    }
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: "Poll has expired" }, { status: 400 });
    }
    const { optionId } = pollVoteSchema.parse(await req.json());
    const fp = fingerprint(req, ip);
    const existing = await db.pollVote.findUnique({ where: { pollId_fingerprint: { pollId: poll.id, fingerprint: fp } } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "You have already voted" }, { status: 409 });
    }

    // Atomic vote: execute the read-mutate-write inside an interactive
    // transaction that serializes on the poll row (Postgres row lock), so
    // concurrent votes to the same poll cannot lose increments. The PollVote
    // unique constraint guarantees one-vote-per-device.
    const voted = await db.$transaction(async (tx) => {
      const current = await tx.poll.findUnique({
        where: { id: poll.id },
        select: { id: true, options: true },
      });
      if (!current) return { error: "Poll not found" } as const;
      const opts = current.options as Array<{ id: string; text: string; votes: number }>;
      const target = opts.find((o) => o.id === optionId);
      if (!target) return { error: "Invalid option" } as const;

      const nextOptions = opts.map((o) =>
        o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
      );
      await tx.poll.update({
        where: { id: poll.id },
        data: { options: nextOptions, totalVotes: { increment: 1 } },
      });
      await tx.pollVote.create({ data: { pollId: poll.id, optionId, fingerprint: fp } });
      return { ok: true } as const;
    });

    if (!voted.ok) {
      if (voted.error === "Invalid option") return NextResponse.json({ ok: false, error: "Invalid option" }, { status: 400 });
      return NextResponse.json({ ok: false, error: voted.error }, { status: 404 });
    }

    const fresh = await db.poll.findUnique({ where: { id: poll.id } });
    publishEvent({ type: "poll.updated" });
    return ok({ poll: fresh });
  } catch (e) {
    return handleError(e);
  }
}
