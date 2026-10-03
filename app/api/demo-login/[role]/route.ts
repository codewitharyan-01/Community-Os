import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, rateLimit } from "@/lib/auth";
import { portalForRole } from "@/lib/permissions";
import { isRoleDisabled } from "@/lib/community-config";
import { DEMO_USERS, isDemoRole } from "@/lib/demo-users";

/**
 * One-tap demo login: GET /api/demo-login/{role}
 * Creates a session for the seeded persona and redirects straight to their portal.
 * Respects admin role-disabling (a disabled portal bounces back to /login with a note).
 */
export async function GET(req: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const base = new URL(req.url).origin;

  if (!isDemoRole(role)) {
    return NextResponse.redirect(`${base}/login?error=unknown-role`);
  }
  rateLimit(`demo-login:${role}`, 30, 60_000);

  const email = DEMO_USERS[role].email;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return NextResponse.redirect(`${base}/login?error=missing-account`);
  }

  if (user.communityId && (await isRoleDisabled(user.communityId, user.role))) {
    return NextResponse.redirect(`${base}/login?disabled=${encodeURIComponent(role)}`);
  }

  await createSession(user.id);
  return NextResponse.redirect(`${base}${portalForRole(user.role)}`);
}
