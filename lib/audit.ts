// Audit trail: every sensitive action records who/what/when (+before/after).
// Append-only by convention — never updated or deleted by app code.

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

type AuditInput = {
  actor: Pick<SessionUser, "id" | "name" | "role"> | null;
  communityId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
};

export async function logAudit(input: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        communityId: input.communityId ?? null,
        userId: input.actor?.id ?? null,
        actorName: input.actor?.name ?? "System",
        actorRole: input.actor?.role ?? "",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? "",
        summary: input.summary ?? "",
        before: input.before !== undefined ? JSON.stringify(input.before) : "",
        after: input.after !== undefined ? JSON.stringify(input.after) : "",
      },
    });
  } catch (e) {
    // Audit must never break the primary action, but surface loudly in dev.
    console.error("[audit] failed to write entry", e);
  }
}
