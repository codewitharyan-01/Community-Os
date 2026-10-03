"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { postSchema, pollSchema, eventSchema, zodErrors, type FieldErrors } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { notifyAdmins, notifyCommunity } from "@/lib/notifications";

// ─── Posts ────────────────────────────────────────────────────────────────────

export type PostState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function createPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const user = await requireCommunityUser();
  const parsed = postSchema.safeParse({
    type: formData.get("type") ?? "DISCUSSION",
    title: formData.get("title") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  // Only admins can post ANNOUNCEMENT / ALERT
  if ((parsed.data.type === "ANNOUNCEMENT" || parsed.data.type === "ALERT") && !can(user.role, "community.moderate")) {
    parsed.data.type = "DISCUSSION";
  }

  const post = await db.post.create({
    data: {
      communityId: user.communityId,
      authorId: user.id,
      type: parsed.data.type,
      title: parsed.data.title ?? "",
      body: parsed.data.body,
    },
  });

  if (parsed.data.type === "ANNOUNCEMENT") {
    await notifyCommunity(
      user.communityId,
      { type: "ANNOUNCEMENT", title: parsed.data.title || "New announcement", body: parsed.data.body.slice(0, 90), link: "/resident/community" },
      user.id
    );
  }

  await logAudit({ actor: user, communityId: user.communityId, action: "POST_CREATED", entity: "Post", entityId: post.id, summary: `Posted ${parsed.data.type.toLowerCase()}` });
  revalidatePath("/resident/community");
  revalidatePath("/resident");
  return { ok: true };
}

export async function togglePostVote(postId: string) {
  const user = await requireCommunityUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.communityId !== user.communityId) throw new Error("Post not found");

  const existing = await db.postVote.findUnique({ where: { postId_userId: { postId, userId: user.id } } });
  if (existing) {
    await db.postVote.delete({ where: { id: existing.id } });
    await db.post.update({ where: { id: postId }, data: { upvoteCount: { decrement: 1 } } });
  } else {
    await db.postVote.create({ data: { postId, userId: user.id } });
    await db.post.update({ where: { id: postId }, data: { upvoteCount: { increment: 1 } } });
  }
  revalidatePath("/resident/community");
}

export async function addPostComment(postId: string, body: string) {
  const user = await requireCommunityUser();
  const text = body.trim();
  if (!text || text.length > 1000) throw new Error("Comment must be 1–1000 characters");
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.communityId !== user.communityId || post.hidden) throw new Error("Post not found");
  if (post.commentsLocked) throw new Error("Comments are locked on this post");

  await db.postComment.create({ data: { postId, userId: user.id, body: text } });
  await db.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
  revalidatePath("/resident/community");
}

export async function reportContent(targetType: "POST" | "COMMENT" | "ISSUE", targetId: string, reason: string) {
  const user = await requireCommunityUser();
  if (!reason.trim()) throw new Error("Please tell us what's wrong");
  await db.report.create({
    data: { communityId: user.communityId, reporterId: user.id, targetType, targetId, reason: reason.trim().slice(0, 500) },
  });
  await notifyAdmins(user.communityId, {
    type: "SYSTEM",
    title: "New moderation report",
    body: `${targetType.toLowerCase()} reported: ${reason.trim().slice(0, 60)}`,
    link: "/admin/community?tab=moderation",
  });
  revalidatePath("/admin/community");
}

export async function deleteOwnPost(postId: string) {
  const user = await requireCommunityUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) throw new Error("You can only delete your own posts");
  await db.post.update({ where: { id: postId }, data: { hidden: true } });
  await logAudit({ actor: user, communityId: user.communityId, action: "POST_DELETED", entity: "Post", entityId: postId, summary: "Author deleted own post" });
  revalidatePath("/resident/community");
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export type PollState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function createPoll(_prev: PollState, formData: FormData): Promise<PollState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "community.poll.create")) return { error: "Only admins and committee members can create polls." };

  const options = formData.getAll("option").map(String).filter((s) => s.trim());
  const parsed = pollSchema.safeParse({
    question: formData.get("question"),
    description: formData.get("description") ?? "",
    kind: formData.get("kind") ?? "INFORMAL",
    days: formData.get("days") ?? 7,
    options,
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const endsAt = new Date(Date.now() + parsed.data.days * 86400000);
  const poll = await db.poll.create({
    data: {
      communityId: user.communityId,
      question: parsed.data.question,
      description: parsed.data.description ?? "",
      kind: parsed.data.kind,
      endsAt,
      createdByUserId: user.id,
      options: { create: parsed.data.options.map((label, i) => ({ label: label.trim(), position: i })) },
    },
  });

  await notifyCommunity(user.communityId, {
    type: "POLL",
    title: `New poll: ${parsed.data.question.slice(0, 60)}`,
    body: `Voting is open for ${parsed.data.days} days.`,
    link: "/resident/community?tab=polls",
  }, user.id);
  await logAudit({ actor: user, communityId: user.communityId, action: "POLL_CREATED", entity: "Poll", entityId: poll.id, summary: parsed.data.question });
  revalidatePath("/resident/community");
  revalidatePath("/admin/community");
  return { ok: true };
}

export async function votePoll(pollId: string, optionId: string) {
  const user = await requireCommunityUser();
  const poll = await db.poll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll || poll.communityId !== user.communityId) throw new Error("Poll not found");
  if (poll.closed || poll.endsAt < new Date()) throw new Error("This poll has closed");
  if (!poll.options.some((o) => o.id === optionId)) throw new Error("Invalid option");

  const existing = await db.pollVote.findUnique({ where: { pollId_userId: { pollId, userId: user.id } } });
  if (existing) throw new Error("You've already voted — one vote per resident");

  await db.pollVote.create({ data: { pollId, optionId, userId: user.id } });
  revalidatePath("/resident/community");
  revalidatePath("/admin/community");
}

export async function closePoll(pollId: string) {
  const user = await requireCommunityUser();
  if (!can(user.role, "community.poll.create")) throw new Error("Not permitted");
  const poll = await db.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.communityId !== user.communityId) throw new Error("Poll not found");
  await db.poll.update({ where: { id: pollId }, data: { closed: true } });
  await logAudit({ actor: user, communityId: user.communityId, action: "POLL_CLOSED", entity: "Poll", entityId: pollId });
  revalidatePath("/resident/community");
  revalidatePath("/admin/community");
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function createEvent(_prev: EventState, formData: FormData): Promise<EventState> {
  const user = await requireCommunityUser();
  if (!can(user.role, "community.event.create")) return { error: "Only admins and committee members can create events." };

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") ?? "EVENT",
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    date: formData.get("date"),
    time: formData.get("time"),
    budget: formData.get("budget") ?? 0,
    volunteerSlots: formData.get("volunteerSlots") ?? 0,
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (isNaN(startsAt.getTime())) return { error: "Invalid date or time" };

  const event = await db.event.create({
    data: {
      communityId: user.communityId,
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description ?? "",
      location: parsed.data.location ?? "",
      startsAt,
      budget: parsed.data.budget,
      volunteerSlots: parsed.data.volunteerSlots,
      createdByUserId: user.id,
    },
  });

  await notifyCommunity(user.communityId, {
    type: "EVENT",
    title: `New event: ${parsed.data.title}`,
    body: `${startsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}${parsed.data.location ? ` · ${parsed.data.location}` : ""}`,
    link: "/resident/community?tab=events",
  }, user.id);
  await logAudit({ actor: user, communityId: user.communityId, action: "EVENT_CREATED", entity: "Event", entityId: event.id, summary: parsed.data.title });
  revalidatePath("/resident/community");
  revalidatePath("/admin/community");
  return { ok: true };
}

export async function rsvpEvent(eventId: string, rsvp: "YES" | "NO" | "MAYBE", volunteer = false) {
  const user = await requireCommunityUser();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.communityId !== user.communityId) throw new Error("Event not found");

  await db.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, rsvp, volunteer },
    update: { rsvp, volunteer },
  });
  revalidatePath("/resident/community");
  revalidatePath("/admin/community");
}
