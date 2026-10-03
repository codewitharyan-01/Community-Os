"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { addDays, randomCode } from "@/lib/utils";

async function guardContext() {
  const user = await requireCommunityUser();
  if (!can(user.role, "security.view")) throw new Error("Security access required");
  return user;
}

export async function checkInByPassCode(passCode: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const user = await guardContext();
  const code = passCode.trim().toUpperCase();
  const visitor = await db.visitor.findUnique({
    where: { passCode: code },
    include: { host: { select: { name: true } } },
  });
  if (!visitor || visitor.communityId !== user.communityId) {
    return { ok: false, error: "Pass not found in this community." };
  }
  if (visitor.status === "CHECKED_IN") return { ok: false, error: "Already checked in — check them out on exit." };
  if (visitor.status === "CHECKED_OUT") return { ok: false, error: "This pass has already been used." };
  if (visitor.status === "EXPIRED" || visitor.validTo < new Date()) return { ok: false, error: "This pass has expired." };

  await db.visitor.update({
    where: { id: visitor.id },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInBy: user.name },
  });

  if (visitor.hostUserId) {
    await notify({
      userIds: [visitor.hostUserId],
      communityId: user.communityId,
      type: "VISITOR",
      title: `${visitor.name} has arrived`,
      body: `Checked in at the gate by ${user.name}.`,
      link: "/resident/services/visitors",
    });
  }

  await logAudit({ actor: user, communityId: user.communityId, action: "VISITOR_CHECKED_IN", entity: "Visitor", entityId: visitor.passCode, summary: `${visitor.name} (host: ${visitor.host?.name ?? "—"})` });
  revalidatePath("/security");
  revalidatePath("/admin/security");
  return { ok: true, message: `${visitor.name} checked in.` };
}

export async function checkOutVisitor(visitorId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await guardContext();
  const visitor = await db.visitor.findUnique({ where: { id: visitorId } });
  if (!visitor || visitor.communityId !== user.communityId) return { ok: false, error: "Visitor not found" };
  if (visitor.status !== "CHECKED_IN") return { ok: false, error: "Visitor is not checked in" };

  await db.visitor.update({
    where: { id: visitorId },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "VISITOR_CHECKED_OUT", entity: "Visitor", entityId: visitor.passCode, summary: visitor.name });
  revalidatePath("/security");
  revalidatePath("/admin/security");
  return { ok: true };
}

export async function walkInVisitor(formData: FormData): Promise<{ ok: boolean; error?: string; message?: string }> {
  const user = await guardContext();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "DELIVERY");
  const vehicle = String(formData.get("vehicleNumber") ?? "").toUpperCase().trim();
  const unitLabel = String(formData.get("unitLabel") ?? "").trim();
  if (!name) return { ok: false, error: "Visitor name is required" };

  // Resolve host unit by label (optional)
  let unitId: string | null = null;
  let hostUserId: string | null = null;
  if (unitLabel) {
    const unit = await db.unit.findFirst({
      where: { communityId: user.communityId, label: { contains: unitLabel } },
      include: { members: { where: { isPrimary: true } } },
    });
    if (unit) {
      unitId = unit.id;
      hostUserId = unit.members[0]?.userId ?? null;
    }
  }

  const passCode = randomCode("WALK", 6);
  await db.visitor.create({
    data: {
      communityId: user.communityId,
      name,
      type,
      vehicleNumber: vehicle,
      unitId,
      hostUserId,
      passCode,
      validFrom: new Date(),
      validTo: addDays(new Date(), 1),
      status: "CHECKED_IN",
      checkedInAt: new Date(),
      checkedInBy: user.name,
      notes: "Gate walk-in entry",
    },
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "VISITOR_WALK_IN", entity: "Visitor", entityId: passCode, summary: `${name} (${type.toLowerCase()})` });
  revalidatePath("/security");
  revalidatePath("/admin/security");
  return { ok: true, message: `${name} logged and checked in.` };
}

export async function logDelivery(formData: FormData): Promise<{ ok: boolean; error?: string; message?: string }> {
  const user = await guardContext();
  const name = String(formData.get("name") ?? "").trim();
  const unitLabel = String(formData.get("unitLabel") ?? "").trim();
  if (!name) return { ok: false, error: "Delivery service name is required" };
  if (!unitLabel) return { ok: false, error: "Destination flat is required" };

  const unit = await db.unit.findFirst({ where: { communityId: user.communityId, label: { contains: unitLabel } } });
  if (!unit) return { ok: false, error: `Flat "${unitLabel}" not found` };

  const passCode = randomCode("DLV", 6);
  await db.visitor.create({
    data: {
      communityId: user.communityId,
      name,
      type: "DELIVERY",
      unitId: unit.id,
      passCode,
      validFrom: new Date(),
      validTo: addDays(new Date(), 1),
      status: "CHECKED_IN",
      checkedInAt: new Date(),
      checkedInBy: user.name,
      notes: "Delivery log",
    },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "DELIVERY_LOGGED", entity: "Visitor", entityId: passCode, summary: `${name} → ${unit.label}` });
  revalidatePath("/security");
  return { ok: true, message: `Delivery logged for ${unit.label}.` };
}
