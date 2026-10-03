"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { issueSchema, zodErrors, type FieldErrors } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { sendEmail, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "@/lib/providers";

export type IssueState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; issueId?: string };

function safeExt(mime: string) {
  return mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : mime === "application/pdf" ? ".pdf" : ".jpg";
}

export async function createIssue(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const user = await requireCommunityUser();
  const parsed = issueSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    location: formData.get("location") ?? "",
    severity: formData.get("severity") ?? "MEDIUM",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  let attachmentPath = "";
  const file = formData.get("photo");
  if (file && file instanceof File && file.size > 0) {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      return { error: "Only JPG, PNG, WEBP or PDF files are allowed." };
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return { error: `File too large (max ${MAX_UPLOAD_MB}MB).` };
    }
    const dir = path.join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    const fileName = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt(file.type)}`;
    await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
    attachmentPath = fileName;
  }

  const slaHours = parsed.data.severity === "CRITICAL" ? 1 : parsed.data.severity === "HIGH" ? 4 : parsed.data.severity === "MEDIUM" ? 24 : 72;

  const issue = await db.issue.create({
    data: {
      communityId: user.communityId,
      authorId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      location: parsed.data.location ?? "",
      severity: parsed.data.severity,
      slaHours,
      attachmentPath,
      timeline: {
        create: { actorName: user.name, toStatus: "SUBMITTED", note: "Issue submitted" },
      },
    },
  });

  await notifyAdmins(user.communityId, {
    type: "ISSUE",
    title: `New issue: ${parsed.data.title.slice(0, 60)}`,
    body: `${parsed.data.severity} severity · ${parsed.data.category}`,
    link: "/admin/issues",
  });

  await sendEmail({
    to: user.email,
    communityId: user.communityId,
    template: "issue_created",
    subject: `Issue registered: ${parsed.data.title.slice(0, 60)}`,
    body: `Hi ${user.name},\n\nYour issue "${parsed.data.title}" has been registered and assigned reference #${issue.id.slice(-6).toUpperCase()}.\nSLA target: within ${slaHours} hours.\n\n— Community OS`,
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "ISSUE_CREATED", entity: "Issue", entityId: issue.id, summary: parsed.data.title });
  revalidatePath("/resident/services/issues");
  revalidatePath("/admin/issues");
  return { ok: true, issueId: issue.id };
}

export async function toggleIssueVote(issueId: string) {
  const user = await requireCommunityUser();
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.communityId !== user.communityId) throw new Error("Issue not found");

  const existing = await db.issueVote.findUnique({ where: { issueId_userId: { issueId, userId: user.id } } });
  if (existing) {
    await db.issueVote.delete({ where: { id: existing.id } });
    const updated = await db.issue.update({ where: { id: issueId }, data: { upvoteCount: { decrement: 1 } } });
    revalidatePath(`/resident/services/issues/${issueId}`);
    return { voted: false, count: updated.upvoteCount };
  }
  await db.issueVote.create({ data: { issueId, userId: user.id } });
  const updated = await db.issue.update({ where: { id: issueId }, data: { upvoteCount: { increment: 1 } } });
  revalidatePath(`/resident/services/issues/${issueId}`);
  return { voted: true, count: updated.upvoteCount };
}

export async function addIssueComment(issueId: string, body: string) {
  const user = await requireCommunityUser();
  const text = body.trim();
  if (!text || text.length > 1000) throw new Error("Comment must be 1–1000 characters");
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.communityId !== user.communityId) throw new Error("Issue not found");

  await db.issueComment.create({ data: { issueId, userId: user.id, body: text } });
  revalidatePath(`/resident/services/issues/${issueId}`);
}

export async function verifyIssue(issueId: string) {
  const user = await requireCommunityUser();
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.communityId !== user.communityId) throw new Error("Issue not found");
  if (issue.authorId !== user.id) throw new Error("Only the reporter can verify the fix");
  if (issue.status !== "RESOLVED") throw new Error("Issue is not marked resolved yet");

  await db.$transaction([
    db.issue.update({ where: { id: issueId }, data: { status: "VERIFIED" } }),
    db.issueEvent.create({ data: { issueId, actorName: user.name, fromStatus: "RESOLVED", toStatus: "VERIFIED", note: "Reporter verified the resolution" } }),
  ]);
  await logAudit({ actor: user, communityId: user.communityId, action: "ISSUE_STATUS_CHANGE", entity: "Issue", entityId: issueId, summary: "RESOLVED → VERIFIED (by reporter)" });
  revalidatePath(`/resident/services/issues/${issueId}`);
  revalidatePath("/admin/issues");
}
