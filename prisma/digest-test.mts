import { maybeSendDailyDigest } from "../src/lib/newsletter";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const result = await maybeSendDailyDigest(true);
console.log("digest result:", JSON.stringify(result));
const audits = await db.auditLog.findMany({
  where: { action: { startsWith: "newsletter.digest" } },
  orderBy: { createdAt: "desc" },
  take: 3,
  select: { action: true, meta: true },
});
console.log(JSON.stringify(audits, null, 1));
await db.$disconnect();
