"use server";

import { requireCommunityUser } from "@/lib/auth";
import { askResidentAI } from "@/lib/ai";
import { db } from "@/lib/db";

export async function askResidentAction(question: string) {
  const user = await requireCommunityUser();
  const unit = await db.membership.findFirst({
    where: { userId: user.id },
    select: { unitId: true },
  });
  return askResidentAI(user.id, unit?.unitId ?? null, question);
}
