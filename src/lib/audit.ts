import { db } from "./db";

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
