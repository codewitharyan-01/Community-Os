"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { CHANNEL_SEED } from "@/lib/constants";

/** Channel names are fixed by policy; membership is community-wide. */
export async function listChannelMessages(channelName: string) {
  const user = await requireCommunityUser();
  if (!(CHANNEL_SEED as readonly string[]).includes(channelName)) throw new Error("Unknown channel");
  const messages = await db.postComment.findMany({
    where: { post: { communityId: user.communityId, title: `__channel:${channelName}`, type: "DISCUSSION" } },
    orderBy: { createdAt: "asc" },
    take: 80,
    include: { user: { select: { name: true, avatarHue: true } } },
  });
  return messages;
}

export async function postChannelMessage(channelName: string, body: string) {
  const user = await requireCommunityUser();
  const text = body.trim();
  if (!text || text.length > 1000) throw new Error("Message must be 1–1000 characters");
  if (!(CHANNEL_SEED as readonly string[]).includes(channelName)) throw new Error("Unknown channel");

  // Channels are materialized as hidden anchor posts (type DISCUSSION, hidden from feed)
  const anchor = await db.post.findFirst({
    where: { communityId: user.communityId, title: `__channel:${channelName}` },
  });
  const postId =
    anchor?.id ??
    (
      await db.post.create({
        data: {
          communityId: user.communityId,
          authorId: user.id,
          type: "DISCUSSION",
          title: `__channel:${channelName}`,
          body: `Channel: ${channelName}`,
          hidden: true,
        },
      })
    ).id;

  await db.postComment.create({ data: { postId, userId: user.id, body: text } });
  revalidatePath("/resident/community");
}
