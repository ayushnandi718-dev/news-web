import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function rangeToDate(range: string | null): Date | null {
  if (!range || range === "all") return null;
  const now = new Date();
  const match = range.match(/^(\d+)(d|m)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (match[2] === "d") {
    now.setDate(now.getDate() - n);
  } else {
    now.setMonth(now.getMonth() - n);
  }
  return now;
}

export async function GET(req: NextRequest) {
  try {
    await requirePerm("ads.manage");
    const range = req.nextUrl.searchParams.get("range");
    const since = rangeToDate(range);

    const dateFilter = since ? { gte: since } : undefined;

    const [allAds, byPayment, byStatus, byPlacement, recentActivity] = await Promise.all([
      db.advertisement.findMany({
        where: { createdAt: dateFilter ?? undefined },
        select: {
          id: true,
          internalName: true,
          advertiserName: true,
          price: true,
          status: true,
          paymentStatus: true,
          paymentDate: true,
          paymentNotes: true,
          impressions: true,
          clicks: true,
          placement: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.advertisement.groupBy({
        by: ["paymentStatus"],
        where: { createdAt: dateFilter ?? undefined },
        _sum: { price: true },
        _count: true,
      }),
      db.advertisement.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter ?? undefined },
        _sum: { price: true, impressions: true, clicks: true },
        _count: true,
      }),
      db.advertisement.groupBy({
        by: ["placement"],
        where: { createdAt: dateFilter ?? undefined },
        _sum: { price: true, impressions: true, clicks: true },
        _count: true,
      }),
      db.auditLog.findMany({
        where: {
          targetType: "advertisement",
          action: { in: ["ad.create", "ad.update", "ad.delete"] },
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          actorEmail: true,
          targetId: true,
          meta: true,
          createdAt: true,
        },
      }),
    ]);

    const totalRevenue = allAds.reduce((s, a) => s + a.price, 0);
    const paidRevenue = allAds
      .filter((a) => a.paymentStatus === "PAID")
      .reduce((s, a) => s + a.price, 0);
    const unpaidRevenue = allAds
      .filter((a) => a.paymentStatus !== "PAID")
      .reduce((s, a) => s + a.price, 0);
    const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0);
    const totalClicks = allAds.reduce((s, a) => s + a.clicks, 0);
    const activeAds = allAds.filter((a) => a.status === "ACTIVE" && !a.deletedAt).length;
    const pendingApproval = allAds.filter(
      (a) => (a.status === "PENDING_REVIEW" || a.status === "PENDING_PAYMENT") && !a.deletedAt
    ).length;
    const deletedAds = allAds.filter((a) => a.deletedAt).length;

    // Monthly revenue trend (last 12 months)
    const monthlyMap = new Map<string, { revenue: number; count: number; paid: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { revenue: 0, count: 0, paid: 0 });
    }
    for (const ad of allAds) {
      const d = new Date(ad.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        const m = monthlyMap.get(key)!;
        m.revenue += ad.price;
        m.count += 1;
        if (ad.paymentStatus === "PAID") m.paid += ad.price;
      }
    }
    const monthly = Array.from(monthlyMap.entries()).map(([month, v]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      revenue: v.revenue,
      paid: v.paid,
      count: v.count,
    }));

    // Parse audit log meta as JSON
    const activity = recentActivity.map((a) => ({
      ...a,
      meta: a.meta ? JSON.parse(a.meta) : null,
    }));

    return ok({
      kpis: {
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? +((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
        activeAds,
        totalAds: allAds.length,
        pendingApproval,
        deletedAds,
      },
      byPayment: byPayment.map((p) => ({
        status: p.paymentStatus,
        revenue: p._sum.price ?? 0,
        count: p._count,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        revenue: s._sum.price ?? 0,
        impressions: s._sum.impressions ?? 0,
        clicks: s._sum.clicks ?? 0,
        count: s._count,
      })),
      byPlacement: byPlacement.map((p) => ({
        placement: p.placement,
        revenue: p._sum.price ?? 0,
        impressions: p._sum.impressions ?? 0,
        clicks: p._sum.clicks ?? 0,
        count: p._count,
      })),
      monthly,
      activity,
      ads: allAds,
    });
  } catch (err) {
    return handleError(err);
  }
}
