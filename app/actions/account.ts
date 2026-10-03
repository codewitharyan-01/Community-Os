"use server";

import { revalidatePath } from "next/cache";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileSchema, zodErrors, type FieldErrors } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/providers";

export async function markAllRead() {
  const user = await requireCommunityUser();
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireCommunityUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    emergencyContact: formData.get("emergencyContact"),
    language: formData.get("language") ?? "en-IN",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  await db.user.update({
    where: { id: user.id },
    data: parsed.data,
  });
  await logAudit({
    actor: user,
    communityId: user.communityId,
    action: "PROFILE_UPDATED",
    entity: "User",
    entityId: user.id,
    summary: "Updated personal profile",
  });
  revalidatePath("/resident/profile");
  return { ok: true };
}

const privacySchema: Record<string, string> = {
  phoneVisibility: "NOBODY|ADMINS|RESIDENTS",
  profileVisibility: "PRIVATE|COMMUNITY",
};

export async function updatePrivacy(key: string, value: string) {
  const user = await requireCommunityUser();
  if (!privacySchema[key] || !privacySchema[key].split("|").includes(value)) {
    throw new Error("Invalid privacy setting");
  }
  const current = JSON.parse((await db.user.findUnique({ where: { id: user.id }, select: { privacy: true } }))?.privacy ?? "{}");
  await db.user.update({
    where: { id: user.id },
    data: { privacy: JSON.stringify({ ...current, [key]: value }) },
  });
  await db.consentRecord.create({
    data: { userId: user.id, kind: `PRIVACY_${key}`, granted: true },
  });
  await logAudit({
    actor: user,
    communityId: user.communityId,
    action: "PRIVACY_UPDATED",
    entity: "User",
    entityId: user.id,
    summary: `${key} → ${value}`,
  });
  revalidatePath("/resident/profile");
}

export async function requestDataExport() {
  const user = await requireCommunityUser();
  await db.consentRecord.create({
    data: { userId: user.id, kind: "DATA_EXPORT", granted: true },
  });
  await sendEmail({
    to: user.email,
    subject: "Your data export request has been received",
    body: `Hi ${user.name},\n\nWe've logged your data export request. A downloadable archive of your Community OS data will be prepared and shared with your registered email.\n\n— Community OS`,
    template: "data_export",
    communityId: user.communityId,
  });
  revalidatePath("/resident/profile");
}
