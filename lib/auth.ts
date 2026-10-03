// Session-based auth on top of httpOnly cookies + DB session table.
// Server-side verification is mandatory — the frontend never decides roles.

import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { portalForRole } from "@/lib/permissions";

const COOKIE_NAME = "cos_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  communityId: string | null;
  avatarHue: number;
  phone: string;
  vendorId?: string | null;
  staffId?: string | null;
};

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

function tokenToHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, token: tokenToHash(raw), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE_NAME, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    await db.session.deleteMany({ where: { token: tokenToHash(raw) } });
  }
  jar.delete(COOKIE_NAME);
}

/** Returns the signed-in user or null. Verifies session + user active status. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const session = await db.session.findUnique({
    where: { token: tokenToHash(raw) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    communityId: u.communityId,
    avatarHue: u.avatarHue,
    phone: u.phone,
    vendorId: u.vendorId,
    staffId: u.staffId,
  };
}

export class AuthError extends Error {}

/** Throws AuthError when not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Please sign in to continue.");
  return user;
}

/** Signed-in user that must belong to a community (skips SUPER_ADMIN). */
export async function requireCommunityUser(): Promise<SessionUser & { communityId: string }> {
  const user = await requireUser();
  if (!user.communityId) throw new AuthError("Your account is not linked to a community.");
  return user as SessionUser & { communityId: string };
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return { ok: false as const, error: "Invalid email or password." };
  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "Invalid email or password." };
  }
  await createSession(user.id);
  return { ok: true as const, redirect: portalForRole(user.role) };
}

// ─── Naive in-memory rate limiter (per-IP, practical for local demo) ─────────

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  rec.count += 1;
  if (rec.count > limit) throw new AuthError("Too many attempts. Please wait a minute and try again.");
}
