import { db } from "@/lib/db";
import { BRAND, siteUrl } from "@/lib/brand";
import { formatDateTime } from "@/lib/format";
import { sendMail, smtpConfigured } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendConfirmation(to: string, token: string): Promise<boolean> {
  const url = `${siteUrl()}/newsletter/confirm/${token}`;
  try {
    await sendMail(
      to,
      `${BRAND.bn} — সাবস্ক্রিপশন নিশ্চিত করুন`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#b91c1c">${BRAND.bn}</h2>
        <p>সকালের সংক্ষিপ্ত সংবাদ সাবস্ক্রিপশন নিশ্চিত করতে নিচের বোতামে ক্লিক করুন।</p>
        <p><a href="${url}" style="background:#b91c1c;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">নিশ্চিত করুন</a></p>
        <p style="color:#64748b;font-size:12px">আপনি যদি এই ইমেল চাননি, এটিকে উপেক্ষা করুন।</p>
      </div>`
    );
    return true;
  } catch (err) {
    console.error("[newsletter] confirmation mail failed:", err);
    return false;
  }
}

export async function subscribeEmail(rawEmail: string): Promise<{ pending: boolean } | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return null;

  const existing = await db.subscriber.findUnique({ where: { email } });
  if (existing) {
    if (existing.status === "UNSUBSCRIBED") {
      const wantsConfirm = smtpConfigured();
      const updated = await db.subscriber.update({
        where: { id: existing.id },
        data: { status: wantsConfirm ? "PENDING" : "ACTIVE", token: newToken() },
      });
      if (wantsConfirm && (await sendConfirmation(updated.email, updated.token))) {
        return { pending: true };
      }
      if (!wantsConfirm) return { pending: false };
      await db.subscriber.update({ where: { id: updated.id }, data: { status: "ACTIVE" } });
      return { pending: false };
    }
    return { pending: existing.status === "PENDING" };
  }

  const wantsConfirm = smtpConfigured();
  const sub = await db.subscriber.create({
    data: { email, status: wantsConfirm ? "PENDING" : "ACTIVE", token: newToken() },
  });
  if (wantsConfirm && (await sendConfirmation(sub.email, sub.token))) {
    return { pending: true };
  }
  if (sub.status === "PENDING") {
    await db.subscriber.update({ where: { id: sub.id }, data: { status: "ACTIVE" } });
  }
  return { pending: false };
}

export async function confirmSubscription(token: string): Promise<boolean> {
  const sub = await db.subscriber.findUnique({ where: { token } });
  if (!sub || sub.status !== "PENDING") return false;
  await db.subscriber.update({ where: { id: sub.id }, data: { status: "ACTIVE" } });
  return true;
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const sub = await db.subscriber.findUnique({ where: { token } });
  if (!sub || sub.status === "UNSUBSCRIBED") return false;
  await db.subscriber.update({
    where: { id: sub.id },
    data: { status: "UNSUBSCRIBED", token: newToken() },
  });
  return true;
}

interface DigestArticle {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  views: number;
  categoryName: string | null;
}

export async function buildDailyDigest(): Promise<DigestArticle[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await db.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
    take: 8,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      views: true,
      category: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    publishedAt: r.publishedAt,
    views: r.views,
    categoryName: r.category?.name ?? null,
  }));
}

export async function sendUnsubscribeLink(email: string): Promise<void> {
  const sub = await db.subscriber.findUnique({ where: { email } });
  if (!sub || sub.status === "UNSUBSCRIBED") return;
  await sendMail(
    sub.email,
    `${BRAND.bn} — আনসাবস্ক্রাইব`,
    `<div style="font-family:sans-serif"><a href="${siteUrl()}/newsletter/unsubscribe/${sub.token}">আনসাবস্ক্রাইব করুন</a></div>`
  );
}

function digestHtml(items: DigestArticle[]): string {
  const list = items
    .map(
      (a) => `
      <li style="margin-bottom:18px">
        <div style="color:#b91c1c;font-size:12px;font-weight:bold">${a.categoryName ?? ""}</div>
        <a href="${siteUrl()}/news/${a.slug}" style="color:#111827;font-size:16px;font-weight:bold;text-decoration:none">${a.title}</a>
        <div style="color:#374151;font-size:13px;margin-top:2px">${a.excerpt.slice(0, 140)}</div>
        <div style="color:#9ca3af;font-size:11px;margin-top:2px">${formatDateTime(a.publishedAt?.toISOString() ?? null)} · ${a.views} পাঠ</div>
      </li>`
    )
    .join("");
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0">
    <div style="background:#b91c1c;color:#fff;padding:14px 20px;font-size:18px;font-weight:bold">${BRAND.bn} — সকালের সংক্ষিপ্ত সংবাদ</div>
    <ol style="padding:20px 20px 8px;list-style:none;margin:0">${list}</ol>
    <div style="padding:12px 20px;background:#f8fafc;color:#64748b;font-size:12px">
      <a href="${siteUrl()}" style="color:#b91c1c">${BRAND.en}</a> · প্রতিদিন সকাল ৭টায়
    </div>
  </div>`;
}

async function auditedToday(action: string): Promise<boolean> {
  const since = new Date(Date.now() - 20 * 3600 * 1000);
  const count = await db.auditLog.count({ where: { action, createdAt: { gte: since } } });
  return count > 0;
}

export async function maybeSendDailyDigest(force = false): Promise<{ status: string; detail?: string }> {
  const subs = await db.subscriber.findMany({
    where: { status: "ACTIVE" },
    select: { email: true },
  });

  if (!force && (await auditedToday("newsletter.digest.sent"))) {
    return { status: "already_sent" };
  }

  if (subs.length === 0) return { status: "no_subscribers" };

  if (!smtpConfigured()) {
    if (!(await auditedToday("newsletter.digest.skipped"))) {
      await db.auditLog.create({
        data: {
          action: "newsletter.digest.skipped",
          meta: JSON.stringify({ subscribers: subs.length, reason: "SMTP not configured" }),
        },
      });
      console.log(`[newsletter] digest skipped — SMTP not configured (${subs.length} subscriber(s) waiting). Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM in .env`);
    }
    return { status: "skipped_no_smtp", detail: `${subs.length} subscriber(s)` };
  }

  const items = await buildDailyDigest();
  if (items.length === 0) return { status: "no_articles" };

  let sent = 0;
  for (const s of subs) {
    try {
      await sendMail(s.email, `${BRAND.bn} — সকালের সংক্ষিপ্ত সংবাদ (${items.length} খবর)`, digestHtml(items));
      sent++;
    } catch (err) {
      console.error(`[newsletter] send failed → ${s.email}:`, err);
    }
  }

  await db.auditLog.create({
    data: {
      action: "newsletter.digest.sent",
      targetType: "newsletter",
      meta: JSON.stringify({ recipients: subs.length, sent, articles: items.length }),
    },
  });
  console.log(`[newsletter] digest sent: ${sent}/${subs.length}`);
  return { status: "sent", detail: `${sent}/${subs.length}` };
}
