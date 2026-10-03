import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { addDays } from "@/lib/utils";

/**
 * POST /api/preventive-maintenance
 * Generates service tasks for assets whose nextServiceAt is due within 7 days.
 * Deterministic, idempotent per asset+week: skips assets that already have an
 * open auto-generated task.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.communityId || !can(user.role, "assets.manage")) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }
  const communityId = user.communityId;
  const now = new Date();
  const horizon = addDays(now, 7);

  const dueAssets = await db.asset.findMany({
    where: {
      communityId,
      active: true,
      nextServiceAt: { lte: horizon },
    },
    include: {
      tasks: { where: { status: { notIn: ["VERIFIED", "COMPLETED"] } } },
    },
  });

  const targets = dueAssets.filter((a) => a.tasks.length === 0);
  const assets: string[] = [];

  for (const asset of targets) {
    await db.maintenanceTask.create({
      data: {
        communityId,
        title: `Service: ${asset.name}`,
        description: "Auto-generated from the preventive maintenance schedule.",
        location: asset.location,
        priority: "MEDIUM",
        dueDate: asset.nextServiceAt ?? horizon,
        assetId: asset.id,
        createdByName: user.name,
        status: "OPEN",
      },
    });
    assets.push(asset.name);
  }

  return NextResponse.json({ created: targets.length, assets });
}
