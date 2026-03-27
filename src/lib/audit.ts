import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function logAudit(action: string, tableName: string, recordId: number | null, details?: Record<string, unknown>) {
  try {
    if (!db) return;
    await db.insert(auditLog).values({
      action,
      tableName,
      recordId,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
