"use server";

import { requireCommunityUser } from "@/lib/auth";
import { askAdminAI } from "@/lib/ai";

export async function askAdminQuery(question: string) {
  const user = await requireCommunityUser();
  return askAdminAI(user.communityId!, question);
}
