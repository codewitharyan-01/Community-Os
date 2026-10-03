"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCommunityUser, hashPassword } from "@/lib/auth";
import { assertCan, can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notify, notifyCommunity, notifyOnce } from "@/lib/notifications";
import { sendEmail } from "@/lib/providers";
import { recordInvoicePayment } from "@/lib/payments-core";
import { updateCommunityConfig, getCommunityConfig, NON_DISABLEABLE_ROLES } from "@/lib/community-config";
import { randomCode, formatINR, addDays, formatDate } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);

export type ActionResult = { ok?: boolean; error?: string; message?: string; tempPassword?: string };

// ─── Residents ────────────────────────────────────────────────────────────────

export async function updateResident(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const userId = str(formData, "userId");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const membershipType = str(formData, "membershipType");
  if (!userId || name.length < 2) return { error: "Name is required." };

  const target = await db.user.findUnique({ where: { id: userId }, include: { memberships: true } });
  if (!target || target.communityId !== user.communityId) return { error: "Resident not found." };

  await db.user.update({ where: { id: userId }, data: { name, phone } });
  if (["OWNER", "TENANT", "FAMILY_MEMBER"].includes(membershipType) && target.memberships[0]) {
    await db.membership.update({
      where: { id: target.memberships[0].id },
      data: { type: membershipType },
    });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: "RESIDENT_UPDATED", entity: "User", entityId: userId, summary: `${name} — profile edited` });
  revalidatePath("/admin/residents");
  return { ok: true, message: "Resident updated." };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.communityId !== user.communityId) return { error: "User not found." };
  if (target.id === user.id) return { error: "You cannot deactivate your own account." };
  if (["COMMUNITY_ADMIN", "SUPER_ADMIN"].includes(target.role) && !active) {
    return { error: "Admin accounts cannot be deactivated here — change their role first." };
  }
  await db.user.update({ where: { id: userId }, data: { active } });
  await db.session.deleteMany({ where: { userId } });
  await logAudit({ actor: user, communityId: user.communityId, action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED", entity: "User", entityId: userId, summary: `${target.name} ${active ? "reactivated" : "deactivated"}` });
  revalidatePath("/admin/residents");
  revalidatePath("/admin/settings");
  return { ok: true, message: active ? "Account reactivated." : "Account deactivated — sessions revoked." };
}

export async function deleteResident(userId: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const target = await db.user.findUnique({ where: { id: userId }, include: { memberships: { include: { unit: true } } } });
  if (!target || target.communityId !== user.communityId) return { error: "Resident not found." };

  const [payments, issues, posts] = await Promise.all([
    db.payment.count({ where: { userId } }),
    db.issue.count({ where: { authorId: userId } }),
    db.post.count({ where: { authorId: userId } }),
  ]);
  if (payments > 0 || issues > 0 || posts > 0) {
    return { error: "This resident has financial/community history. Deactivate the account instead of deleting." };
  }

  const unitIds = target.memberships.map((m) => m.unitId);
  await db.$transaction([
    db.membership.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
    db.notification.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  // Free up units with no remaining members
  for (const unitId of unitIds) {
    const remaining = await db.membership.count({ where: { unitId } });
    if (remaining === 0) await db.unit.update({ where: { id: unitId }, data: { status: "VACANT" } });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: "RESIDENT_DELETED", entity: "User", entityId: userId, summary: `${target.name} removed` });
  revalidatePath("/admin/residents");
  return { ok: true, message: "Resident removed." };
}

// ─── Team members (admin-side roles) ─────────────────────────────────────────

const TEAM_ROLES = [
  "COMMUNITY_ADMIN", "COMMITTEE_MEMBER", "SECRETARY", "TREASURER", "ACCOUNTANT",
  "FACILITY_MANAGER", "SECURITY_MANAGER", "SECURITY_GUARD", "MAINTENANCE_STAFF",
];

export async function addTeamMember(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "settings.manage");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role");
  const phone = str(formData, "phone");
  const password = str(formData, "password");

  if (name.length < 2) return { error: "Name is required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Valid email is required." };
  if (!TEAM_ROLES.includes(role)) return { error: "Choose a valid team role." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists." };

  const tempPassword = password || randomCode("PW", 8).replace("-", "").toLowerCase();
  const created = await db.user.create({
    data: {
      communityId: user.communityId,
      email, name, phone,
      role,
      passwordHash: hashPassword(tempPassword),
      avatarHue: Math.floor(Math.random() * 6),
    },
  });

  await sendEmail({
    to: email,
    communityId: user.communityId,
    template: "team_welcome",
    subject: `You've been added to the Community OS team`,
    body: `Hi ${name},\n\nYou've been added as ${role.replace(/_/g, " ").toLowerCase()}.\nEmail: ${email}\nTemporary password: ${tempPassword}\n\n— Community OS`,
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "TEAM_MEMBER_ADDED", entity: "User", entityId: created.id, summary: `${name} as ${role}` });
  revalidatePath("/admin/settings");
  return { ok: true, message: `${name} added as ${role.replace(/_/g, " ").toLowerCase()}.`, tempPassword: password ? undefined : tempPassword };
}

export async function updateTeamMember(userId: string, role: string, active: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "settings.manage");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.communityId !== user.communityId) return { error: "User not found." };
  if (target.id === user.id && (!active || role !== user.role)) {
    return { error: "You cannot change your own role or deactivate yourself." };
  }
  if (target.role === "COMMUNITY_ADMIN" && (role !== "COMMUNITY_ADMIN" || !active)) {
    const admins = await db.user.count({ where: { communityId: user.communityId, role: "COMMUNITY_ADMIN", active: true } });
    if (admins <= 1) return { error: "The community must keep at least one active Community Admin." };
  }
  if (!TEAM_ROLES.includes(role) && target.role !== role) return { error: "Invalid role." };
  if (target.role === "SUPER_ADMIN") return { error: "The platform super admin cannot be modified here." };

  await db.user.update({ where: { id: userId }, data: { role, active } });
  if (!active) await db.session.deleteMany({ where: { userId } });
  await logAudit({ actor: user, communityId: user.communityId, action: "TEAM_MEMBER_UPDATED", entity: "User", entityId: userId, summary: `${target.name}: role=${role}, active=${active}` });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Team member updated." };
}

// ─── Property: buildings & units ──────────────────────────────────────────────

export async function addBuildingWithUnits(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const name = str(formData, "name");
  const code = str(formData, "code").toUpperCase();
  const floors = num(formData, "floors");
  const perFloor = num(formData, "perFloor");
  if (name.length < 2 || !code || floors < 1 || floors > 60 || perFloor < 1 || perFloor > 30) {
    return { error: "Provide a name, code, and 1–60 floors with 1–30 units per floor." };
  }
  const exists = await db.building.findFirst({ where: { communityId: user.communityId, OR: [{ name }, { code }] } });
  if (exists) return { error: "A building with this name or code already exists." };

  const building = await db.building.create({ data: { communityId: user.communityId, name, code, floors } });
  const unitData = [];
  for (let f = 1; f <= floors; f++) {
    for (let u = 1; u <= perFloor; u++) {
      unitData.push({ communityId: user.communityId, buildingId: building.id, floor: f, label: `${code}-${f}${String(u).padStart(2, "0")}` });
    }
  }
  await db.unit.createMany({ data: unitData });
  await logAudit({ actor: user, communityId: user.communityId, action: "BUILDING_ADDED", entity: "Building", entityId: building.id, summary: `${name} with ${unitData.length} units` });
  revalidatePath("/admin/residents");
  revalidatePath("/admin/finance");
  return { ok: true, message: `${name} added with ${unitData.length} units.` };
}

export async function setUnitStatus(unitId: string, status: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  if (!["OCCUPIED", "VACANT"].includes(status)) return { error: "Invalid status." };
  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.communityId !== user.communityId) return { error: "Unit not found." };
  await db.unit.update({ where: { id: unitId }, data: { status } });
  await logAudit({ actor: user, communityId: user.communityId, action: "UNIT_STATUS_CHANGED", entity: "Unit", entityId: unitId, summary: `${unit.label} → ${status}` });
  revalidatePath("/admin/residents");
  return { ok: true };
}

// ─── Facilities ───────────────────────────────────────────────────────────────

export async function upsertFacility(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "facilities.manage");
  const id = str(formData, "id");
  const name = str(formData, "name");
  const description = str(formData, "description");
  const hourlyFee = Math.max(0, num(formData, "hourlyFee"));
  const openHour = Math.min(23, Math.max(0, num(formData, "openHour")));
  const closeHour = Math.min(24, Math.max(1, num(formData, "closeHour")));
  const maxPerMonth = Math.max(1, num(formData, "maxPerMonth"));
  const approvalRequired = str(formData, "approvalRequired") === "on";
  if (name.length < 2) return { error: "Facility name is required." };
  if (closeHour <= openHour) return { error: "Close hour must be after open hour." };

  if (id) {
    const facility = await db.facility.findUnique({ where: { id } });
    if (!facility || facility.communityId !== user.communityId) return { error: "Facility not found." };
    await db.facility.update({ where: { id }, data: { name, description, hourlyFee, openHour, closeHour, maxPerMonth, approvalRequired } });
    await logAudit({ actor: user, communityId: user.communityId, action: "FACILITY_UPDATED", entity: "Facility", entityId: id, summary: name });
  } else {
    await db.facility.create({ data: { communityId: user.communityId, name, description, hourlyFee, openHour, closeHour, maxPerMonth, approvalRequired } });
    await logAudit({ actor: user, communityId: user.communityId, action: "FACILITY_ADDED", entity: "Facility", summary: name });
    await notifyCommunity(user.communityId, { type: "ANNOUNCEMENT", title: `New facility: ${name}`, body: "Bookable from the Services tab.", link: "/resident/services/facilities" }, user.id);
  }
  revalidatePath("/admin/facilities");
  revalidatePath("/resident/services/facilities");
  return { ok: true, message: id ? "Facility updated." : "Facility added." };
}

export async function toggleFacility(id: string, active: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "facilities.manage");
  const facility = await db.facility.findUnique({ where: { id } });
  if (!facility || facility.communityId !== user.communityId) return { error: "Facility not found." };
  await db.facility.update({ where: { id }, data: { active } });
  await logAudit({ actor: user, communityId: user.communityId, action: active ? "FACILITY_ENABLED" : "FACILITY_DISABLED", entity: "Facility", entityId: id, summary: facility.name });
  revalidatePath("/admin/facilities");
  revalidatePath("/resident/services/facilities");
  return { ok: true };
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function upsertVendor(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "vendors.manage");
  const id = str(formData, "id");
  const company = str(formData, "company");
  const category = str(formData, "category") || "OTHER";
  const contactName = str(formData, "contactName");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const monthlyAmount = Math.max(0, num(formData, "monthlyAmount"));
  const contractEnd = str(formData, "contractEnd");
  if (company.length < 2) return { error: "Company name is required." };

  const data = {
    company, category, contactName, phone, email, monthlyAmount,
    contractEnd: contractEnd ? new Date(contractEnd) : null,
    status: contractEnd && new Date(contractEnd).getTime() - Date.now() < 30 * 86400000 ? "EXPIRING" : "ACTIVE",
  };
  if (id) {
    const vendor = await db.vendor.findUnique({ where: { id } });
    if (!vendor || vendor.communityId !== user.communityId) return { error: "Vendor not found." };
    await db.vendor.update({ where: { id }, data });
    await logAudit({ actor: user, communityId: user.communityId, action: "VENDOR_UPDATED", entity: "Vendor", entityId: id, summary: company });
  } else {
    await db.vendor.create({ data: { communityId: user.communityId, ...data } });
    await logAudit({ actor: user, communityId: user.communityId, action: "VENDOR_ADDED", entity: "Vendor", summary: company });
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/finance");
  return { ok: true, message: id ? "Vendor updated." : "Vendor added." };
}

// ─── Domestic staff ───────────────────────────────────────────────────────────

export async function upsertStaff(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const id = str(formData, "id");
  const name = str(formData, "name");
  const workType = str(formData, "workType") || "OTHER";
  const phone = str(formData, "phone");
  const assignedUnits = str(formData, "assignedUnits");
  const verification = str(formData, "verification") === "VERIFIED" ? "VERIFIED" : "PENDING";
  if (name.length < 2) return { error: "Staff name is required." };

  if (id) {
    const staff = await db.staff.findUnique({ where: { id } });
    if (!staff || staff.communityId !== user.communityId) return { error: "Staff not found." };
    await db.staff.update({ where: { id }, data: { name, workType, phone, assignedUnits, verification } });
    await logAudit({ actor: user, communityId: user.communityId, action: "STAFF_UPDATED", entity: "Staff", entityId: id, summary: name });
  } else {
    await db.staff.create({ data: { communityId: user.communityId, name, workType, phone, assignedUnits, verification, active: true } });
    await logAudit({ actor: user, communityId: user.communityId, action: "STAFF_ADDED", entity: "Staff", summary: `${name} (${workType.toLowerCase()})` });
  }
  revalidatePath("/resident/services");
  return { ok: true, message: id ? "Staff updated." : "Staff added." };
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "residents.manage");
  const staff = await db.staff.findUnique({ where: { id } });
  if (!staff || staff.communityId !== user.communityId) return { error: "Staff not found." };
  await db.staff.update({ where: { id }, data: { active } });
  await logAudit({ actor: user, communityId: user.communityId, action: active ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED", entity: "Staff", entityId: id, summary: staff.name });
  revalidatePath("/resident/services");
  return { ok: true };
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function deleteDocument(id: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "documents.manage");
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.communityId !== user.communityId) return { error: "Document not found." };
  await db.document.delete({ where: { id } });
  await logAudit({ actor: user, communityId: user.communityId, action: "DOCUMENT_DELETED", entity: "Document", entityId: id, summary: doc.title });
  revalidatePath("/admin/documents");
  revalidatePath("/resident/services/documents");
  return { ok: true, message: "Document deleted." };
}

export async function setDocumentVisibility(id: string, visibility: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "documents.manage");
  if (!["RESIDENT", "COMMITTEE", "ADMIN"].includes(visibility)) return { error: "Invalid visibility." };
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.communityId !== user.communityId) return { error: "Document not found." };
  await db.document.update({ where: { id }, data: { visibility } });
  await logAudit({ actor: user, communityId: user.communityId, action: "DOCUMENT_VISIBILITY_CHANGED", entity: "Document", entityId: id, summary: `${doc.title} → ${visibility}` });
  revalidatePath("/admin/documents");
  revalidatePath("/resident/services/documents");
  return { ok: true };
}

// ─── Events & polls ───────────────────────────────────────────────────────────

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.event.create");
  const id = str(formData, "id");
  const title = str(formData, "title");
  const location = str(formData, "location");
  const description = str(formData, "description");
  const date = str(formData, "date");
  const time = str(formData, "time");
  if (!id || title.length < 3) return { error: "Event title is required." };
  const event = await db.event.findUnique({ where: { id } });
  if (!event || event.communityId !== user.communityId) return { error: "Event not found." };

  const startsAt = date && time ? new Date(`${date}T${time}:00`) : event.startsAt;
  if (isNaN(startsAt.getTime())) return { error: "Invalid date or time." };
  await db.event.update({ where: { id }, data: { title, location, description, startsAt } });
  await logAudit({ actor: user, communityId: user.communityId, action: "EVENT_UPDATED", entity: "Event", entityId: id, summary: title });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
  return { ok: true, message: "Event updated." };
}

export async function setEventCancelled(id: string, cancelled: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.event.create");
  const event = await db.event.findUnique({ where: { id }, include: { registrations: { select: { userId: true } } } });
  if (!event || event.communityId !== user.communityId) return { error: "Event not found." };
  await db.event.update({ where: { id }, data: { cancelled } });
  if (cancelled) {
    await notify({
      userIds: event.registrations.map((r) => r.userId),
      communityId: user.communityId,
      type: "EVENT",
      title: `Cancelled: ${event.title}`,
      body: "The event has been cancelled by the committee.",
      priority: "HIGH",
      link: "/resident/community?tab=events",
    });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: cancelled ? "EVENT_CANCELLED" : "EVENT_RESTORED", entity: "Event", entityId: id, summary: event.title });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
  return { ok: true, message: cancelled ? "Event cancelled — registrants notified." : "Event restored." };
}

export async function deletePoll(id: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.poll.create");
  const poll = await db.poll.findUnique({ where: { id } });
  if (!poll || poll.communityId !== user.communityId) return { error: "Poll not found." };
  await db.$transaction([
    db.pollVote.deleteMany({ where: { pollId: id } }),
    db.pollOption.deleteMany({ where: { pollId: id } }),
    db.poll.delete({ where: { id } }),
  ]);
  await logAudit({ actor: user, communityId: user.communityId, action: "POLL_DELETED", entity: "Poll", entityId: id, summary: poll.question });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
  return { ok: true, message: "Poll deleted." };
}

// ─── Posts (admin) ────────────────────────────────────────────────────────────

export async function adminUpdatePost(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  const id = str(formData, "id");
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!id || body.length < 1) return { error: "Post body is required." };
  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.communityId !== user.communityId) return { error: "Post not found." };
  await db.post.update({ where: { id }, data: { title, body } });
  await logAudit({ actor: user, communityId: user.communityId, action: "POST_EDITED", entity: "Post", entityId: id, summary: title || body.slice(0, 40) });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
  return { ok: true, message: "Post updated." };
}

export async function adminDeletePost(id: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.communityId !== user.communityId) return { error: "Post not found." };
  await db.post.update({ where: { id }, data: { hidden: true } });
  await logAudit({ actor: user, communityId: user.communityId, action: "POST_DELETED", entity: "Post", entityId: id, summary: post.title || post.body.slice(0, 40) });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
  return { ok: true, message: "Post removed." };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function updateTaskDetails(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "tasks.manage");
  const id = str(formData, "id");
  const title = str(formData, "title");
  const priority = str(formData, "priority") || "MEDIUM";
  const dueDate = str(formData, "dueDate");
  const assignedToUserId = str(formData, "assignedToUserId");
  if (!id || title.length < 3) return { error: "Task title is required." };
  const task = await db.maintenanceTask.findUnique({ where: { id } });
  if (!task || task.communityId !== user.communityId) return { error: "Task not found." };

  const newAssignee = assignedToUserId || null;
  await db.maintenanceTask.update({
    where: { id },
    data: {
      title, priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedToUserId: newAssignee,
      status: newAssignee && task.status === "OPEN" ? "ASSIGNED" : task.status,
    },
  });
  if (newAssignee && newAssignee !== task.assignedToUserId) {
    await notify({ userIds: [newAssignee], communityId: user.communityId, type: "SYSTEM", title: `Task assigned: ${title.slice(0, 50)}`, body: `Priority: ${priority.toLowerCase()}`, link: "/work" });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: "TASK_UPDATED", entity: "MaintenanceTask", entityId: id, summary: title });
  revalidatePath("/admin/issues");
  revalidatePath("/work");
  return { ok: true, message: "Task updated." };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "tasks.manage");
  const task = await db.maintenanceTask.findUnique({ where: { id } });
  if (!task || task.communityId !== user.communityId) return { error: "Task not found." };
  await db.maintenanceTask.delete({ where: { id } });
  await logAudit({ actor: user, communityId: user.communityId, action: "TASK_DELETED", entity: "MaintenanceTask", entityId: id, summary: task.title });
  revalidatePath("/admin/issues");
  return { ok: true, message: "Task deleted." };
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function upsertAsset(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "assets.manage");
  const id = str(formData, "id");
  const name = str(formData, "name");
  const category = str(formData, "category") || "OTHER";
  const location = str(formData, "location");
  const condition = str(formData, "condition") || "GOOD";
  const intervalDays = num(formData, "intervalDays");
  if (name.length < 2) return { error: "Asset name is required." };

  if (id) {
    const asset = await db.asset.findUnique({ where: { id } });
    if (!asset || asset.communityId !== user.communityId) return { error: "Asset not found." };
    await db.asset.update({
      where: { id },
      data: { name, category, location, condition, intervalDays: intervalDays > 0 ? intervalDays : null },
    });
    await logAudit({ actor: user, communityId: user.communityId, action: "ASSET_UPDATED", entity: "Asset", entityId: id, summary: name });
  } else {
    const code = `AST-${category.slice(0, 3).toUpperCase()}-${randomCode("X", 4).slice(2)}`;
    await db.asset.create({
      data: {
        communityId: user.communityId, assetCode: `${code}${Date.now() % 97}`, name, category, location, condition,
        intervalDays: intervalDays > 0 ? intervalDays : null,
        nextServiceAt: intervalDays > 0 ? addDays(new Date(), intervalDays) : null,
      },
    });
    await logAudit({ actor: user, communityId: user.communityId, action: "ASSET_ADDED", entity: "Asset", summary: name });
  }
  revalidatePath("/admin/assets");
  return { ok: true, message: id ? "Asset updated." : "Asset added." };
}

export async function markAssetServiced(id: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "assets.manage");
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset || asset.communityId !== user.communityId) return { error: "Asset not found." };
  const next = asset.intervalDays ? addDays(new Date(), asset.intervalDays) : null;
  await db.asset.update({
    where: { id },
    data: { lastServiceAt: new Date(), nextServiceAt: next, condition: asset.condition === "POOR" ? "FAIR" : asset.condition },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "ASSET_SERVICED", entity: "Asset", entityId: id, summary: `${asset.name} — service logged${next ? `, next due ${next.toISOString().slice(0, 10)}` : ""}` });
  revalidatePath("/admin/assets");
  return { ok: true, message: `${asset.name} marked serviced.` };
}

// ─── Community config & role controls ─────────────────────────────────────────

export async function saveBillingConfig(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "settings.manage");
  const maintenance = Math.max(0, num(formData, "maintenance"));
  const dueDay = Math.min(28, Math.max(1, num(formData, "dueDay")));
  await updateCommunityConfig(user.communityId, { maintenance, dueDay });
  await logAudit({ actor: user, communityId: user.communityId, action: "BILLING_CONFIG_UPDATED", entity: "Community", summary: `maintenance=${formatINR(maintenance)}, dueDay=${dueDay}` });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/finance");
  return { ok: true, message: "Billing defaults saved." };
}

export async function setRoleEnabled(role: string, enabled: boolean): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "settings.manage");
  if (NON_DISABLEABLE_ROLES.includes(role)) return { error: "This role cannot be disabled." };
  const cfg = await getCommunityConfig(user.communityId);
  const disabled = new Set(Array.isArray(cfg.disabledRoles) ? cfg.disabledRoles : []);
  if (enabled) disabled.delete(role);
  else disabled.add(role);
  await updateCommunityConfig(user.communityId, { disabledRoles: [...disabled] });

  if (!enabled) {
    // Revoke live sessions for that role so the change takes effect immediately.
    const users = await db.user.findMany({ where: { communityId: user.communityId, role }, select: { id: true } });
    for (const u of users) await db.session.deleteMany({ where: { userId: u.id } });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: enabled ? "ROLE_ENABLED" : "ROLE_DISABLED", entity: "Role", entityId: role, summary: `${role} portal ${enabled ? "enabled" : "disabled"}` });
  revalidatePath("/admin/settings");
  return { ok: true, message: `${role.replace(/_/g, " ").toLowerCase()} portal ${enabled ? "enabled" : "disabled — sessions revoked"}.` };
}

// ─── Broadcast & reminders ────────────────────────────────────────────────────

export async function broadcastNotification(formData: FormData): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  const audience = str(formData, "audience") || "EVERYONE";
  const type = str(formData, "type") || "ANNOUNCEMENT";
  const priority = str(formData, "priority") === "HIGH" ? "HIGH" : "NORMAL";
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (title.length < 3) return { error: "Notification title is required." };

  let userIds: string[] = [];
  if (audience === "RESIDENTS") {
    const users = await db.user.findMany({ where: { communityId: user.communityId, role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] }, active: true }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (audience === "ADMINS") {
    const users = await db.user.findMany({ where: { communityId: user.communityId, role: { in: ["COMMUNITY_ADMIN", "COMMITTEE_MEMBER", "SECRETARY", "TREASURER", "ACCOUNTANT", "FACILITY_MANAGER", "SECURITY_MANAGER"] }, active: true }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (audience === "STAFF") {
    const users = await db.user.findMany({ where: { communityId: user.communityId, role: { in: ["MAINTENANCE_STAFF", "VENDOR", "SECURITY_GUARD"] }, active: true }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else {
    const users = await db.user.findMany({ where: { communityId: user.communityId, active: true }, select: { id: true } });
    userIds = users.map((u) => u.id);
  }
  if (userIds.length === 0) return { error: "No users in this audience." };

  await notify({ userIds: userIds.filter((id) => id !== user.id), communityId: user.communityId, type, title, body, priority, link: type === "ANNOUNCEMENT" ? "/resident/community" : "" });
  await logAudit({ actor: user, communityId: user.communityId, action: "BROADCAST_SENT", entity: "Notification", summary: `${title} → ${audience.toLowerCase()} (${userIds.length})` });
  revalidatePath("/admin");
  return { ok: true, message: `Notification sent to ${userIds.length} recipient${userIds.length > 1 ? "s" : ""}.` };
}

export async function sendPaymentReminders(): Promise<ActionResult> {
  const user = await requireCommunityUser();
  if (!can(user.role, "finance.manage") && !can(user.role, "billing.run")) return { error: "Not permitted." };
  const communityId = user.communityId;
  const horizon = addDays(new Date(), 3);

  const invoices = await db.invoice.findMany({
    where: { communityId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, dueOn: { lte: horizon } },
    include: { unit: { include: { members: { include: { user: { select: { id: true, email: true, name: true } } } } } } },
  });
  if (invoices.length === 0) return { ok: true, message: "No invoices are due within 3 days — nothing to remind." };

  let sent = 0;
  let emailed = 0;
  for (const invoice of invoices) {
    const members = invoice.unit.members;
    if (members.length === 0) continue;
    const overdue = invoice.status === "OVERDUE" || invoice.dueOn < new Date();
    const title = overdue
      ? `Overdue reminder: ${formatINR(invoice.total)} for ${invoice.unit.label}`
      : `Payment due ${formatDate(invoice.dueOn)}: ${formatINR(invoice.total)}`;
    const count = await notifyOnce(
      members.map((m) => m.user.id),
      {
        communityId,
        type: "PAYMENT",
        title,
        body: `${invoice.number} · ${periodLabelSafe(invoice.period)} maintenance.`,
        link: "/resident/payments",
        priority: overdue ? "HIGH" : "NORMAL",
      },
      24
    );
    sent += count;
    if (count > 0 && overdue) {
      const primary = members.find((m) => m.type === "OWNER") ?? members[0];
      await sendEmail({
        to: primary.user.email,
        communityId,
        template: "payment_reminder",
        subject: title,
        body: `Dear ${primary.user.name},\n\nInvoice ${invoice.number} (${formatINR(invoice.total)}) for ${invoice.unit.label} is past its due date of ${formatDate(invoice.dueOn)}.\nPlease clear it from the resident portal to avoid late fees.\n\n— Community OS`,
      });
      emailed += 1;
    }
  }
  await logAudit({ actor: user, communityId, action: "PAYMENT_REMINDERS_SENT", entity: "Invoice", summary: `${sent} reminder notification(s), ${emailed} overdue email(s)` });
  revalidatePath("/admin/finance");
  return sent > 0
    ? { ok: true, message: `${sent} reminder${sent > 1 ? "s" : ""} sent (skipped recently-notified residents).` }
    : { ok: true, message: "All due residents were already reminded in the last 24h." };
}

function periodLabelSafe(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : period;
}

// ─── Manual (office) payment collection ───────────────────────────────────────

export async function recordManualPayment(invoiceId: string, method: string, note: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.manage");
  if (!["CASH", "CHEQUE", "UPI", "NETBANKING"].includes(method)) return { error: "Invalid method." };
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { unit: true } });
  if (!invoice || invoice.communityId !== user.communityId) return { error: "Invoice not found." };

  const result = await recordInvoicePayment({
    actor: user,
    invoiceId,
    method: method as "CASH" | "CHEQUE" | "UPI" | "NETBANKING",
    idempotencyKey: `office:${invoiceId}:${method}`,
    source: "ADMIN_OFFICE",
    providerTxn: `TXN-OFFICE-${Date.now().toString().slice(-8)}`,
  });
  if (!result.ok) return { error: result.error };
  if (note.trim()) {
    await logAudit({ actor: user, communityId: user.communityId, action: "PAYMENT_NOTE", entity: "Invoice", entityId: invoiceId, summary: note.trim() });
  }
  revalidatePath("/admin/finance");
  return { ok: true, message: `${formatINR(invoice.total)} recorded for ${invoice.unit.label} (${method.toLowerCase()}). Receipt ${result.receipt.receiptNumber}.` };
}

export async function voidInvoiceSafe(invoiceId: string): Promise<ActionResult> {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.manage");
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.communityId !== user.communityId) return { error: "Invoice not found." };
  if (invoice.status === "PAID") return { error: "Paid invoices cannot be voided — issue a credit note instead." };
  await db.invoice.update({ where: { id: invoiceId }, data: { status: "VOIDED" } });
  await logAudit({ actor: user, communityId: user.communityId, action: "INVOICE_VOIDED", entity: "Invoice", entityId: invoiceId, summary: invoice.number, before: invoice.status, after: "VOIDED" });
  revalidatePath("/admin/finance");
  return { ok: true, message: `${invoice.number} voided.` };
}
