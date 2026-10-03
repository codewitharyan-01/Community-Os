// Community-level feature/role configuration.
// Admins can disable portals for roles the community doesn't use
// (e.g. switch off the Security Guard desk) — enforced server-side.

import { db } from "@/lib/db";

export const NON_DISABLEABLE_ROLES = ["COMMUNITY_ADMIN", "SUPER_ADMIN", "OWNER", "TENANT", "FAMILY_MEMBER"];

export const TOGGLEABLE_ROLES: { role: string; label: string; description: string }[] = [
  { role: "SECURITY_GUARD", label: "Security Guard desk", description: "Gate check-in/out and vehicle lookup" },
  { role: "VENDOR", label: "Vendor portal", description: "External service partners" },
  { role: "MAINTENANCE_STAFF", label: "Maintenance staff portal", description: "In-house technicians" },
  { role: "TREASURER", label: "Treasurer access", description: "Finance administration" },
  { role: "ACCOUNTANT", label: "Accountant access", description: "Billing and ledger" },
  { role: "SECRETARY", label: "Secretary access", description: "Notices, documents, residents" },
  { role: "COMMITTEE_MEMBER", label: "Committee access", description: "Oversight and moderation" },
  { role: "FACILITY_MANAGER", label: "Facility manager access", description: "Assets, tasks, facilities" },
  { role: "SECURITY_MANAGER", label: "Security manager access", description: "Incidents and emergency" },
];

export type CommunityConfig = {
  maintenance?: number;
  dueDay?: number;
  disabledRoles?: string[];
  [key: string]: unknown;
};

export async function getCommunityConfig(communityId: string): Promise<CommunityConfig> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { config: true },
  });
  try {
    return JSON.parse(community?.config ?? "{}") as CommunityConfig;
  } catch {
    return {};
  }
}

export async function getDisabledRoles(communityId: string): Promise<string[]> {
  const cfg = await getCommunityConfig(communityId);
  return Array.isArray(cfg.disabledRoles) ? (cfg.disabledRoles as string[]) : [];
}

export async function isRoleDisabled(communityId: string, role: string): Promise<boolean> {
  const disabled = await getDisabledRoles(communityId);
  return disabled.includes(role);
}

export async function updateCommunityConfig(communityId: string, patch: CommunityConfig): Promise<void> {
  const current = await getCommunityConfig(communityId);
  await db.community.update({
    where: { id: communityId },
    data: { config: JSON.stringify({ ...current, ...patch }) },
  });
}
