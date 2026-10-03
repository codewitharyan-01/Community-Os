"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireCommunityUser, hashPassword } from "@/lib/auth";
import { assertCan, can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notify, notifyCommunity, notifyAdmins } from "@/lib/notifications";
import { sendEmail, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "@/lib/providers";
import {
  billingRunSchema, expenseSchema, residentSchema, taskSchema, incidentSchema, emergencySchema,
  zodErrors, type FieldErrors,
} from "@/lib/validators";
import { formatINR, periodLabel, randomCode } from "@/lib/utils";
import { ISSUE_STATUS_LABELS } from "@/lib/constants";

// ─── Billing engine ───────────────────────────────────────────────────────────

export type BillingState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; message?: string };

export async function createBillingRun(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "billing.run")) return { error: "You don't have permission to run billing." };

  const parsed = billingRunSchema.safeParse({
    period: formData.get("period"),
    maintenance: formData.get("maintenance"),
    parking: formData.get("parking") ?? 0,
    water: formData.get("water") ?? 0,
    sinkingFund: formData.get("sinkingFund") ?? 0,
    repairFund: formData.get("repairFund") ?? 0,
    dueDay: formData.get("dueDay") ?? 10,
    buildingId: formData.get("buildingId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const d = parsed.data;
  const [year, month] = d.period.split("-").map(Number);
  if (!year || !month) return { error: "Invalid period" };
  const dueOn = new Date(year, month - 1, d.dueDay);

  // Units in scope (optionally one building)
  const units = await db.unit.findMany({
    where: { communityId: user.communityId, status: "OCCUPIED", ...(d.buildingId ? { buildingId: d.buildingId } : {}) },
    include: { building: true },
  });
  if (units.length === 0) return { error: "No occupied units in scope." };

  // Skip units that already have an invoice for this period
  const existing = await db.invoice.findMany({
    where: { communityId: user.communityId, period: d.period, unitId: { in: units.map((u) => u.id) } },
    select: { unitId: true },
  });
  const existingSet = new Set(existing.map((e) => e.unitId));
  const targets = units.filter((u) => !existingSet.has(u.id));
  if (targets.length === 0) {
    return { error: `All in-scope units already have invoices for ${periodLabel(d.period)}.` };
  }

  const chargeLines: { kind: string; label: string; amount: number }[] = [
    { kind: "MAINTENANCE", label: "Maintenance", amount: d.maintenance },
    { kind: "PARKING", label: "Parking", amount: d.parking },
    { kind: "WATER", label: "Water", amount: d.water },
    { kind: "SINKING_FUND", label: "Sinking Fund", amount: d.sinkingFund },
    { kind: "REPAIR_FUND", label: "Repair Fund", amount: d.repairFund },
  ].filter((c) => c.amount > 0);

  if (chargeLines.length === 0) return { error: "Add at least one charge above zero." };
  const perUnitTotal = chargeLines.reduce((s, c) => s + c.amount, 0);

  const run = await db.billingRun.create({
    data: {
      communityId: user.communityId,
      period: d.period,
      title: `${periodLabel(d.period)} maintenance`,
      status: "POSTED",
      unitCount: targets.length,
      totalAmount: perUnitTotal * targets.length,
      createdByUserId: user.id,
      postedAt: new Date(),
    },
  });

  await db.invoice.createMany({
    data: targets.map((u) => ({
      communityId: user.communityId!,
      unitId: u.id,
      billingRunId: run.id,
      number: `INV-${d.period}-${u.label.replace(/\s+/g, "")}`,
      period: d.period,
      issuedOn: new Date(),
      dueOn,
      total: perUnitTotal,
      status: "PENDING",
    })),
  });

  // Attach charge line items to every generated invoice
  const createdInvoices = await db.invoice.findMany({
    where: { billingRunId: run.id },
    select: { id: true },
  });
  await db.invoiceItem.createMany({
    data: createdInvoices.flatMap((inv) => chargeLines.map((c) => ({ invoiceId: inv.id, kind: c.kind, label: c.label, amount: c.amount }))),
  });

  // Notify affected residents
  const memberships = await db.membership.findMany({
    where: { unitId: { in: targets.map((u) => u.id) } },
    select: { userId: true },
  });
  await notify({
    userIds: memberships.map((m) => m.userId),
    communityId: user.communityId,
    type: "PAYMENT",
    title: `${periodLabel(d.period)} invoice generated`,
    body: `${formatINR(perUnitTotal)} due by ${dueOn.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`,
    link: "/resident/payments",
  });

  await logAudit({
    actor: user, communityId: user.communityId,
    action: "BILLING_RUN_POSTED", entity: "BillingRun", entityId: run.id,
    summary: `Posted ${targets.length} invoices for ${periodLabel(d.period)} (${formatINR(perUnitTotal)}/unit)`,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/resident/payments");
  return { ok: true, message: `${targets.length} invoices generated and residents notified.` };
}

export async function voidInvoice(invoiceId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.manage");
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.communityId !== user.communityId) throw new Error("Invoice not found");
  if (invoice.status === "PAID") throw new Error("Paid invoices cannot be voided — issue a credit note instead.");
  await db.invoice.update({ where: { id: invoiceId }, data: { status: "VOIDED" } });
  await logAudit({ actor: user, communityId: user.communityId, action: "INVOICE_VOIDED", entity: "Invoice", entityId: invoiceId, summary: invoice.number, before: invoice.status, after: "VOIDED" });
  revalidatePath("/admin/finance");
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function createExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "finance.manage")) return { error: "You don't have permission to record expenses." };
  const parsed = expenseSchema.safeParse({
    vendorId: formData.get("vendorId") ?? "",
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  await db.expense.create({
    data: {
      communityId: user.communityId,
      vendorId: parsed.data.vendorId || null,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      status: "PENDING_APPROVAL",
    },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "EXPENSE_CREATED", entity: "Expense", summary: `${parsed.data.description} (${formatINR(parsed.data.amount)})` });
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function approveExpense(expenseId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.approve");
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.communityId !== user.communityId) throw new Error("Expense not found");
  if (expense.status !== "PENDING_APPROVAL") throw new Error("Only pending expenses can be approved");

  await db.expense.update({ where: { id: expenseId }, data: { status: "APPROVED", approvedByName: user.name } });
  await db.ledgerEntry.create({
    data: {
      communityId: user.communityId, date: expense.date, type: "EXPENSE",
      category: expense.category, description: expense.description, amount: expense.amount,
      refType: "EXPENSE", refId: expense.id,
    },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "EXPENSE_APPROVED", entity: "Expense", entityId: expenseId, summary: `${expense.description} (${formatINR(expense.amount)})`, before: expense.status, after: "APPROVED" });
  revalidatePath("/admin/finance");
}

export async function rejectExpense(expenseId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.approve");
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.communityId !== user.communityId) throw new Error("Expense not found");
  await db.expense.update({ where: { id: expenseId }, data: { status: "REJECTED" } });
  await logAudit({ actor: user, communityId: user.communityId, action: "EXPENSE_REJECTED", entity: "Expense", entityId: expenseId, summary: expense.description, before: expense.status, after: "REJECTED" });
  revalidatePath("/admin/finance");
}

export async function markExpensePaid(expenseId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "finance.manage");
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.communityId !== user.communityId) throw new Error("Expense not found");
  if (expense.status !== "APPROVED") throw new Error("Only approved expenses can be marked paid");
  await db.expense.update({ where: { id: expenseId }, data: { status: "PAID", paidAt: new Date() } });
  await logAudit({ actor: user, communityId: user.communityId, action: "EXPENSE_PAID", entity: "Expense", entityId: expenseId, summary: `${expense.description} (${formatINR(expense.amount)})`, before: "APPROVED", after: "PAID" });
  revalidatePath("/admin/finance");
}

// ─── Residents ────────────────────────────────────────────────────────────────

export type ResidentState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; tempPassword?: string };

export async function addResident(_prev: ResidentState, formData: FormData): Promise<ResidentState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "residents.manage")) return { error: "You don't have permission to add residents." };
  const parsed = residentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    role: formData.get("role") ?? "OWNER",
    unitId: formData.get("unitId"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const unit = await db.unit.findUnique({ where: { id: parsed.data.unitId } });
  if (!unit || unit.communityId !== user.communityId) return { error: "Unit not found in your community." };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { error: "A user with this email already exists." };

  const tempPassword = parsed.data.password || randomCode("PW", 8).replace("-", "").toLowerCase();
  const newUser = await db.user.create({
    data: {
      communityId: user.communityId,
      email: parsed.data.email.toLowerCase(),
      passwordHash: hashPassword(tempPassword),
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
      role: parsed.data.role,
      avatarHue: Math.floor(Math.random() * 6),
    },
  });
  await db.membership.create({
    data: { userId: newUser.id, unitId: unit.id, type: parsed.data.role, isPrimary: parsed.data.role === "OWNER" },
  });
  await db.unit.update({ where: { id: unit.id }, data: { status: "OCCUPIED" } });

  await sendEmail({
    to: newUser.email,
    communityId: user.communityId,
    template: "resident_welcome",
    subject: `Welcome to ${unit.label} — your Community OS account`,
    body: `Hi ${parsed.data.name},\n\nYour Community OS account is ready.\nEmail: ${newUser.email}\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password.\n\n— Community OS`,
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "RESIDENT_ADDED", entity: "User", entityId: newUser.id, summary: `${parsed.data.name} → ${unit.label}` });
  revalidatePath("/admin/residents");
  return { ok: true, tempPassword: parsed.data.password ? undefined : tempPassword };
}

// ─── Issues: assignment & status (admin side) ─────────────────────────────────

export type AssignState = { ok?: boolean; error?: string };

export async function assignIssue(issueId: string, assigneeUserId: string, assigneeVendorId: string, note: string): Promise<AssignState> {
  const user = await requireCommunityUser();
  assertCan(user.role, "issues.assign");
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.communityId !== user.communityId) return { error: "Issue not found" };

  const nextStatus = "ASSIGNED";
  await db.$transaction([
    db.issue.update({
      where: { id: issueId },
      data: {
        assignedToUserId: assigneeUserId || null,
        assignedVendorId: assigneeVendorId || null,
        status: nextStatus,
      },
    }),
    db.issueEvent.create({
      data: {
        issueId, actorName: user.name, fromStatus: issue.status, toStatus: nextStatus,
        note: note.trim() || `Assigned to ${assigneeUserId ? "staff" : "vendor"}`,
      },
    }),
  ]);

  await notify({
    userIds: assigneeUserId ? [assigneeUserId] : [],
    communityId: user.communityId,
    type: "ISSUE",
    title: `Issue assigned: ${issue.title.slice(0, 50)}`,
    body: note.trim() || "You've been assigned a maintenance issue.",
    link: "/work",
    priority: issue.severity === "CRITICAL" ? "HIGH" : "NORMAL",
  });

  await notify({
    userIds: [issue.authorId],
    communityId: user.communityId,
    type: "ISSUE",
    title: `Your issue is now ${ISSUE_STATUS_LABELS[nextStatus].toLowerCase()}`,
    body: issue.title.slice(0, 60),
    link: `/resident/services/issues/${issueId}`,
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "ISSUE_ASSIGNED", entity: "Issue", entityId: issueId, summary: issue.title });
  revalidatePath("/admin/issues");
  revalidatePath(`/resident/services/issues/${issueId}`);
  return { ok: true };
}

export async function updateIssueStatus(issueId: string, newStatus: string, note: string): Promise<AssignState> {
  const user = await requireCommunityUser();
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.communityId !== user.communityId) return { error: "Issue not found" };

  const isAdmin = can(user.role, "issues.status.update");
  const isAssignee = issue.assignedToUserId === user.id || (user.vendorId && issue.assignedVendorId === user.vendorId);
  if (!isAdmin && !isAssignee) return { error: "Not permitted to update this issue" };

  await db.$transaction([
    db.issue.update({
      where: { id: issueId },
      data: { status: newStatus, resolvedAt: newStatus === "RESOLVED" ? new Date() : issue.resolvedAt },
    }),
    db.issueEvent.create({
      data: { issueId, actorName: user.name, fromStatus: issue.status, toStatus: newStatus, note: note.trim() },
    }),
  ]);

  await notify({
    userIds: [issue.authorId],
    communityId: user.communityId,
    type: "ISSUE",
    title: `Your issue is now ${ISSUE_STATUS_LABELS[newStatus]?.toLowerCase() ?? newStatus.toLowerCase()}`,
    body: issue.title.slice(0, 60),
    link: `/resident/services/issues/${issueId}`,
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "ISSUE_STATUS_CHANGE", entity: "Issue", entityId: issueId, summary: `${issue.title}: ${issue.status} → ${newStatus}`, before: issue.status, after: newStatus });
  revalidatePath("/admin/issues");
  revalidatePath("/work");
  revalidatePath(`/resident/services/issues/${issueId}`);
  return { ok: true };
}

// ─── Community moderation ─────────────────────────────────────────────────────

export async function moderateReport(reportId: string, action: "HIDE" | "DELETE" | "DISMISS" | "LOCK") {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report || report.communityId !== user.communityId) throw new Error("Report not found");

  if (action === "DISMISS") {
    await db.report.update({ where: { id: reportId }, data: { status: "DISMISSED" } });
  } else {
    await db.report.update({ where: { id: reportId }, data: { status: "ACTIONED" } });
    if (report.targetType === "POST") {
      const data = action === "HIDE" ? { hidden: true } : action === "LOCK" ? { commentsLocked: true } : { hidden: true };
      await db.post.update({ where: { id: report.targetId }, data }).catch(() => {});
    } else if (report.targetType === "COMMENT") {
      await db.postComment.update({ where: { id: report.targetId }, data: { hidden: true } }).catch(() => {});
    }
  }
  await logAudit({ actor: user, communityId: user.communityId, action: `MODERATION_${action}`, entity: "Report", entityId: reportId, summary: report.reason.slice(0, 80) });
  revalidatePath("/admin/community");
}

export async function togglePinPost(postId: string, pinned: boolean) {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  await db.post.update({ where: { id: postId }, data: { pinned } });
  await logAudit({ actor: user, communityId: user.communityId, action: pinned ? "POST_PINNED" : "POST_UNPINNED", entity: "Post", entityId: postId });
  revalidatePath("/admin/community");
  revalidatePath("/resident/community");
}

export async function announcePost(postId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "community.moderate");
  const post = await db.post.update({ where: { id: postId }, data: { pinned: true } });
  await notifyCommunity(user.communityId, {
    type: "ANNOUNCEMENT",
    title: post.title || "New announcement",
    body: post.body.slice(0, 90),
    link: "/resident/community",
  }, user.id);
  revalidatePath("/admin/community");
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function createTask(_prev: TaskState, formData: FormData): Promise<TaskState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "tasks.manage")) return { error: "Not permitted" };
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    priority: formData.get("priority") ?? "MEDIUM",
    dueDate: formData.get("dueDate") ?? "",
    assignedToUserId: formData.get("assignedToUserId") ?? "",
    assignedVendorId: formData.get("assignedVendorId") ?? "",
    assetId: formData.get("assetId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const task = await db.maintenanceTask.create({
    data: {
      communityId: user.communityId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      location: parsed.data.location ?? "",
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignedToUserId: parsed.data.assignedToUserId || null,
      assignedVendorId: parsed.data.assignedVendorId || null,
      assetId: parsed.data.assetId || null,
      status: parsed.data.assignedToUserId || parsed.data.assignedVendorId ? "ASSIGNED" : "OPEN",
      createdByName: user.name,
    },
  });

  if (parsed.data.assignedToUserId) {
    await notify({
      userIds: [parsed.data.assignedToUserId],
      communityId: user.communityId,
      type: "SYSTEM",
      title: `New task: ${parsed.data.title.slice(0, 50)}`,
      body: `Priority: ${parsed.data.priority.toLowerCase()}${parsed.data.dueDate ? ` · due ${parsed.data.dueDate}` : ""}`,
      link: "/work",
    });
  }
  await logAudit({ actor: user, communityId: user.communityId, action: "TASK_CREATED", entity: "MaintenanceTask", entityId: task.id, summary: parsed.data.title });
  revalidatePath("/admin/issues");
  revalidatePath("/admin/assets");
  return { ok: true };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const user = await requireCommunityUser();
  const task = await db.maintenanceTask.findUnique({ where: { id: taskId } });
  if (!task || task.communityId !== user.communityId) throw new Error("Task not found");
  const allowed = can(user.role, "tasks.manage") || task.assignedToUserId === user.id || (user.vendorId && task.assignedVendorId === user.vendorId);
  if (!allowed) throw new Error("Not permitted");

  await db.maintenanceTask.update({
    where: { id: taskId },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : task.completedAt },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "TASK_STATUS_CHANGE", entity: "MaintenanceTask", entityId: taskId, summary: `${task.title}: ${task.status} → ${status}`, before: task.status, after: status });
  revalidatePath("/admin/issues");
  revalidatePath("/work");
}

// ─── Security: incidents & emergency ──────────────────────────────────────────

export async function createIncident(_prev: { ok?: boolean; error?: string }, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireCommunityUser();
  if (!can(user.role, "security.incident")) return { error: "Not permitted" };
  const parsed = incidentSchema.safeParse({
    type: formData.get("type"),
    severity: formData.get("severity") ?? "MEDIUM",
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
  });
  if (!parsed.success) return { error: Object.values(zodErrors(parsed.error))[0] };

  await db.securityIncident.create({
    data: { communityId: user.communityId, ...parsed.data, reportedByName: user.name },
  });
  await notifyAdmins(user.communityId, {
    type: "SECURITY",
    title: `Incident reported: ${parsed.data.title.slice(0, 50)}`,
    body: `${parsed.data.type} · ${parsed.data.severity}`,
    link: "/admin/security?tab=incidents",
    priority: "HIGH",
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "INCIDENT_REPORTED", entity: "SecurityIncident", summary: parsed.data.title });
  revalidatePath("/admin/security");
  revalidatePath("/security");
  return { ok: true };
}

export async function resolveIncident(incidentId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "security.incident");
  await db.securityIncident.update({
    where: { id: incidentId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "INCIDENT_RESOLVED", entity: "SecurityIncident", entityId: incidentId });
  revalidatePath("/admin/security");
  revalidatePath("/security");
}

export async function raiseEmergency(_prev: { ok?: boolean; error?: string }, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireCommunityUser();
  if (!can(user.role, "security.emergency")) return { error: "Not permitted" };
  const parsed = emergencySchema.safeParse({
    type: formData.get("type"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: Object.values(zodErrors(parsed.error))[0] };

  await db.emergencyAlert.create({
    data: { communityId: user.communityId, ...parsed.data, createdByName: user.name },
  });
  await notifyCommunity(user.communityId, {
    type: "EMERGENCY",
    title: `🚨 ${parsed.data.type} emergency`,
    body: parsed.data.message,
    link: "/resident/community?tab=feed",
    priority: "HIGH",
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "EMERGENCY_RAISED", entity: "EmergencyAlert", summary: `${parsed.data.type}: ${parsed.data.message.slice(0, 80)}` });
  revalidatePath("/admin/security");
  revalidatePath("/security");
  revalidatePath("/resident");
  return { ok: true };
}

export async function resolveEmergency(alertId: string) {
  const user = await requireCommunityUser();
  assertCan(user.role, "security.emergency");
  await db.emergencyAlert.update({
    where: { id: alertId },
    data: { active: false, resolvedAt: new Date(), resolvedByName: user.name },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "EMERGENCY_RESOLVED", entity: "EmergencyAlert", entityId: alertId });
  revalidatePath("/admin/security");
  revalidatePath("/security");
  revalidatePath("/resident");
}

// ─── Documents ────────────────────────────────────────────────────────────────

export type DocumentState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function uploadDocument(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "documents.manage")) return { error: "Not permitted" };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "POLICIES");
  const visibility = String(formData.get("visibility") ?? "RESIDENT");
  const file = formData.get("file");

  if (!title) return { error: "Title is required." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return { error: "Only JPG, PNG, WEBP or PDF files are allowed." };
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return { error: `File too large (max ${MAX_UPLOAD_MB}MB).` };

  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : file.type === "application/pdf" ? ".pdf" : ".jpg";
  const fileName = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  await db.document.create({
    data: {
      communityId: user.communityId,
      title,
      category,
      visibility,
      fileName,
      mimeType: file.type,
      size: file.size,
      uploadedByName: user.name,
    },
  });

  if (visibility === "RESIDENT") {
    await notifyCommunity(user.communityId, {
      type: "ANNOUNCEMENT",
      title: `New document: ${title}`,
      body: "Published to all residents.",
      link: "/resident/services/documents",
    }, user.id);
  }

  await logAudit({ actor: user, communityId: user.communityId, action: "DOCUMENT_UPLOADED", entity: "Document", summary: title });
  revalidatePath("/admin/documents");
  revalidatePath("/resident/services/documents");
  return { ok: true };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function updateCommunitySettings(formData: FormData) {
  const user = await requireCommunityUser();
  assertCan(user.role, "settings.manage");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name) throw new Error("Community name is required");
  await db.community.update({
    where: { id: user.communityId },
    data: { name, city },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "SETTINGS_UPDATED", entity: "Community", entityId: user.communityId, summary: `Renamed to ${name}` });
  revalidatePath("/admin/settings");
}
