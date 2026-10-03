import { db } from "@/lib/db";

type NotifyInput = {
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority?: "NORMAL" | "HIGH";
  communityId?: string | null;
  dedupeKey?: string;
};

/** Create in-app notifications for a set of users (skips actor if included). */
export async function notify(input: NotifyInput) {
  const unique = [...new Set(input.userIds)].filter(Boolean);
  if (unique.length === 0) return;
  try {
    await db.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        communityId: input.communityId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? "",
        link: input.link ?? "",
        priority: input.priority ?? "NORMAL",
      })),
    });
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

/** Notify every active member of a community (optionally excluding a user). */
export async function notifyCommunity(
  communityId: string,
  data: Omit<NotifyInput, "userIds">,
  excludeUserId?: string
) {
  const users = await db.user.findMany({
    where: { communityId, active: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  await notify({ ...data, userIds: users.map((u) => u.id), communityId });
}

/** Notify committee + admins only. */
export async function notifyAdmins(
  communityId: string,
  data: Omit<NotifyInput, "userIds">,
  excludeUserId?: string
) {
  const ADMIN_ROLES = [
    "COMMUNITY_ADMIN", "COMMITTEE_MEMBER", "SECRETARY", "TREASURER", "ACCOUNTANT",
    "FACILITY_MANAGER", "SECURITY_MANAGER", "SUPER_ADMIN",
  ];
  const users = await db.user.findMany({
    where: {
      communityId, active: true, role: { in: ADMIN_ROLES },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  await notify({ ...data, userIds: users.map((u) => u.id), communityId });
}

/**
 * Notify with a de-duplication window: skips users who received an identical
 * title within the last `dedupeHours`. Used by reminder runs so repeated
 * clicks (or daily jobs) never spam the same resident.
 */
export async function notifyOnce(
  userIds: string[],
  data: Omit<NotifyInput, "userIds">,
  dedupeHours = 24
) {
  const since = new Date(Date.now() - dedupeHours * 3600000);
  const recent = await db.notification.findMany({
    where: { title: data.title, createdAt: { gte: since } },
    select: { userId: true },
  });
  const recentlySent = new Set(recent.map((r) => r.userId));
  const fresh = userIds.filter((id) => !recentlySent.has(id));
  if (fresh.length === 0) return 0;
  await notify({ ...data, userIds: fresh });
  return fresh.length;
}
