"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { destroySession } from "@/lib/auth";
import { requireCommunityUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

const run = promisify(exec);

/**
 * DEV-ONLY: reset the demo database to the original seed.
 * Guarded by NODE_ENV and the settings.manage capability (double lock).
 */
export async function resetDemoAction(): Promise<void> {
  const user = await requireCommunityUser();
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo reset is only available in development mode.");
  }
  if (!can(user.role, "settings.manage")) {
    throw new Error("Only admins can reset the demo database.");
  }

  await destroySession();
  await run("npx prisma migrate reset --force --skip-generate", { cwd: process.cwd(), timeout: 180000 });
}
