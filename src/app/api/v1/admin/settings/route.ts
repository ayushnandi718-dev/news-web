import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const urlish = z.string().trim().max(400);
const shortText = z.string().trim().max(200);

const siteSettingsSchema = z.object({
  siteNameBn: z.string().trim().min(1).max(80),
  siteNameEn: z.string().trim().max(80).default(""),
  tagline: z.string().trim().max(200).default(""),
  logoUrl: urlish.default(""),
  contactEmail: z.union([z.string().email().max(200), z.literal("")]).default(""),
  contactPhone: z.string().trim().max(24).default(""),
  contactWhatsapp: z.string().trim().max(24).default(""),
  contactAddress: z.string().trim().max(400).default(""),
  facebookUrl: urlish.default(""),
  instagramUrl: urlish.default(""),
  youtubeUrl: urlish.default(""),
  xUrl: urlish.default(""),
});

type SettingsBody = z.infer<typeof siteSettingsSchema>;

export async function GET() {
  try {
    await requirePerm("settings.manage");
    const rows = await db.siteSetting.findMany();
    return ok({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePerm("settings.manage");
    const body: SettingsBody = siteSettingsSchema.parse(await req.json());
    const entries = Object.entries(body) as [string, string][];
    for (const [key, value] of entries) {
      await db.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "settings.update",
      targetType: "site_settings",
      targetId: "general",
      meta: { keys: entries.map(([k]) => k) },
    });
    return ok({ saved: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError("Please check the fields — a valid email and website name are required.");
    }
    return handleError(err);
  }
}
