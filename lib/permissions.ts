// Centralized Role-Based Access Control.
// Roles are declared once; permissions derive from capability sets so that
// pages/actions ask "can this user do X" instead of scattering role checks.

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  COMMUNITY_ADMIN: "COMMUNITY_ADMIN",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  SECRETARY: "SECRETARY",
  TREASURER: "TREASURER",
  ACCOUNTANT: "ACCOUNTANT",
  FACILITY_MANAGER: "FACILITY_MANAGER",
  SECURITY_MANAGER: "SECURITY_MANAGER",
  SECURITY_GUARD: "SECURITY_GUARD",
  MAINTENANCE_STAFF: "MAINTENANCE_STAFF",
  VENDOR: "VENDOR",
  OWNER: "OWNER",
  TENANT: "TENANT",
  FAMILY_MEMBER: "FAMILY_MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  COMMUNITY_ADMIN: "Community Admin",
  COMMITTEE_MEMBER: "Committee Member",
  SECRETARY: "Secretary",
  TREASURER: "Treasurer",
  ACCOUNTANT: "Accountant",
  FACILITY_MANAGER: "Facility Manager",
  SECURITY_MANAGER: "Security Manager",
  SECURITY_GUARD: "Security Guard",
  MAINTENANCE_STAFF: "Maintenance Staff",
  VENDOR: "Vendor",
  OWNER: "Owner",
  TENANT: "Tenant",
  FAMILY_MEMBER: "Family Member",
};

// ─── Portal routing ───────────────────────────────────────────────────────────

export const RESIDENT_ROLES: Role[] = [ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER];
export const ADMIN_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.COMMUNITY_ADMIN,
  ROLES.COMMITTEE_MEMBER,
  ROLES.SECRETARY,
  ROLES.TREASURER,
  ROLES.ACCOUNTANT,
  ROLES.FACILITY_MANAGER,
  ROLES.SECURITY_MANAGER,
];
export const GUARD_ROLES: Role[] = [ROLES.SECURITY_GUARD];
export const WORK_ROLES: Role[] = [ROLES.VENDOR, ROLES.MAINTENANCE_STAFF];

export function portalForRole(role: string): string {
  if (ADMIN_ROLES.includes(role as Role)) return "/admin";
  if (RESIDENT_ROLES.includes(role as Role)) return "/resident";
  if (GUARD_ROLES.includes(role as Role)) return "/security";
  if (WORK_ROLES.includes(role as Role)) return "/work";
  return "/resident";
}

// ─── Capabilities ─────────────────────────────────────────────────────────────

export const CAPABILITIES = [
  "finance.view", "finance.manage", "finance.approve",
  "billing.run", "residents.manage", "residents.view",
  "issues.view.all", "issues.assign", "issues.status.update",
  "community.post", "community.moderate", "community.poll.create", "community.event.create",
  "security.view", "security.checkin", "security.incident", "security.emergency",
  "facilities.manage", "vendors.manage", "assets.manage", "tasks.manage", "tasks.work",
  "documents.view.all", "documents.manage", "reports.view", "audit.view", "settings.manage",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const BASE: Capability[] = ["community.post"];

const ROLE_CAPS: Record<string, Capability[]> = {
  SUPER_ADMIN: [...CAPABILITIES],
  COMMUNITY_ADMIN: [...CAPABILITIES],
  COMMITTEE_MEMBER: [
    ...BASE, "residents.view", "issues.view.all", "issues.assign", "issues.status.update",
    "community.moderate", "community.poll.create", "community.event.create",
    "finance.view", "facilities.manage", "tasks.manage",
    "documents.view.all", "reports.view", "security.view",
  ],
  SECRETARY: [
    ...BASE, "residents.view", "residents.manage", "issues.view.all", "issues.assign",
    "issues.status.update", "community.moderate", "community.poll.create", "community.event.create",
    "facilities.manage", "vendors.manage", "tasks.manage", "documents.view.all", "documents.manage",
    "reports.view", "audit.view", "security.view",
  ],
  TREASURER: [
    ...BASE, "finance.view", "finance.manage", "finance.approve", "billing.run",
    "residents.view", "reports.view", "audit.view", "documents.view.all", "vendors.manage",
  ],
  ACCOUNTANT: [
    ...BASE, "finance.view", "finance.manage", "billing.run", "residents.view",
    "reports.view", "documents.view.all",
  ],
  FACILITY_MANAGER: [
    ...BASE, "residents.view", "issues.view.all", "issues.assign", "issues.status.update",
    "facilities.manage", "assets.manage", "tasks.manage", "vendors.manage", "documents.view.all",
  ],
  SECURITY_MANAGER: [
    ...BASE, "residents.view", "security.view", "security.checkin", "security.incident",
    "security.emergency", "tasks.manage", "issues.view.all",
  ],
  SECURITY_GUARD: ["security.view", "security.checkin", "security.incident", "security.emergency"],
  MAINTENANCE_STAFF: ["tasks.work", "issues.view.all", "issues.status.update"],
  VENDOR: ["tasks.work"],
  OWNER: [...BASE],
  TENANT: [...BASE],
  FAMILY_MEMBER: [...BASE],
};

export function can(role: string, cap: Capability): boolean {
  return (ROLE_CAPS[role] ?? BASE).includes(cap);
}

export function assertCan(role: string, cap: Capability) {
  if (!can(role, cap)) throw new Error("You do not have permission to perform this action.");
}

export function isWorkRole(role: string) {
  return WORK_ROLES.includes(role as Role);
}
export function isAdminRole(role: string) {
  return ADMIN_ROLES.includes(role as Role);
}
export function isResidentRole(role: string) {
  return RESIDENT_ROLES.includes(role as Role);
}
export function isGuardRole(role: string) {
  return GUARD_ROLES.includes(role as Role);
}
