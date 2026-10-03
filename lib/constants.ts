// Shared constants: labels, colors and option lists used across the app.

export const ISSUE_CATEGORIES = [
  "WATER", "PLUMBING", "DRAINAGE", "ELECTRICAL", "LIFT", "SECURITY",
  "PARKING", "CLEANING", "NOISE", "GARBAGE", "GARDEN", "OTHER",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  WATER: "Water", PLUMBING: "Plumbing", DRAINAGE: "Drainage", ELECTRICAL: "Electrical",
  LIFT: "Lift", SECURITY: "Security", PARKING: "Parking", CLEANING: "Cleaning",
  NOISE: "Noise", GARBAGE: "Garbage", GARDEN: "Garden", OTHER: "Other",
};

export const ISSUE_STATUSES = [
  "SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "VERIFIED", "CLOSED",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", WAITING: "Waiting", RESOLVED: "Resolved",
  VERIFIED: "Verified", CLOSED: "Closed",
};

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical",
};

export const INVOICE_STATUSES = ["PENDING", "PAID", "OVERDUE", "PARTIAL", "VOIDED"] as const;
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending", PAID: "Paid", OVERDUE: "Overdue", PARTIAL: "Partial", VOIDED: "Voided",
};

export const EXPENSE_CATEGORIES = [
  "SECURITY", "ELECTRICITY", "CLEANING", "WATER", "REPAIRS",
  "GARDEN", "LIFT", "EVENTS", "ADMIN", "OTHER",
] as const;
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SECURITY: "Security", ELECTRICITY: "Electricity", CLEANING: "Cleaning", WATER: "Water",
  REPAIRS: "Repairs", GARDEN: "Garden", LIFT: "Lift", EVENTS: "Events", ADMIN: "Administrative",
  OTHER: "Other",
};

export const POST_TYPES = [
  "ANNOUNCEMENT", "SUGGESTION", "EVENT", "LOST_FOUND", "ALERT", "APPRECIATION", "DISCUSSION",
] as const;
export const POST_TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Announcement", SUGGESTION: "Suggestion", EVENT: "Event", LOST_FOUND: "Lost & Found",
  ALERT: "Alert", APPRECIATION: "Appreciation", DISCUSSION: "Discussion",
};

export const VISITOR_TYPES = ["GUEST", "DELIVERY", "CAB", "CONTRACTOR", "STAFF"] as const;
export const VISITOR_TYPE_LABELS: Record<string, string> = {
  GUEST: "Guest", DELIVERY: "Delivery", CAB: "Cab", CONTRACTOR: "Contractor", STAFF: "Domestic Staff",
};

export const EMERGENCY_TYPES = ["FIRE", "MEDICAL", "SECURITY", "FLOOD", "POWER", "OTHER"] as const;
export const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  FIRE: "Fire", MEDICAL: "Medical", SECURITY: "Security", FLOOD: "Flood", POWER: "Power", OTHER: "Other",
};

export const CHARGE_KINDS = [
  { kind: "MAINTENANCE", label: "Maintenance" },
  { kind: "WATER", label: "Water" },
  { kind: "PARKING", label: "Parking" },
  { kind: "SINKING_FUND", label: "Sinking Fund" },
  { kind: "REPAIR_FUND", label: "Repair Fund" },
  { kind: "OTHER", label: "Other" },
] as const;

export const ASSET_CATEGORIES = [
  "LIFT", "PUMP", "GENERATOR", "CCTV", "FIRE_SAFETY", "SOLAR", "WATER_TANK", "GYM", "EV_CHARGER", "OTHER",
] as const;
export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  LIFT: "Lift", PUMP: "Pump", GENERATOR: "Generator", CCTV: "CCTV", FIRE_SAFETY: "Fire Safety",
  SOLAR: "Solar", WATER_TANK: "Water Tank", GYM: "Gym", EV_CHARGER: "EV Charger", OTHER: "Other",
};

export const TASK_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED", "VERIFIED"] as const;
export const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress", WAITING: "Waiting",
  COMPLETED: "Completed", VERIFIED: "Verified",
};

export const DOCUMENT_CATEGORIES = [
  "REGISTRATION", "BYE_LAWS", "INSURANCE", "CONTRACTS", "AUDIT", "MINUTES", "NOTICES", "POLICIES",
] as const;
export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  REGISTRATION: "Society Registration", BYE_LAWS: "Bye-laws", INSURANCE: "Insurance",
  CONTRACTS: "Contracts", AUDIT: "Audit Reports", MINUTES: "Meeting Minutes",
  NOTICES: "Notices", POLICIES: "Policies",
};

export const CHANNEL_SEED = [
  "General", "Announcements", "Tower A", "Tower B", "Tower C", "Events", "Buy & Sell", "Emergency",
] as const;

// Status → tone mapping for badges (kept subtle, state-only color)
export const STATUS_TONE: Record<string, "green" | "red" | "orange" | "blue" | "gray"> = {
  PAID: "green", RESOLVED: "green", VERIFIED: "green", APPROVED: "green", CONFIRMED: "green",
  SUCCESS: "green", ACTIVE: "green", OCCUPIED: "green", CHECKED_OUT: "green", COMPLETED: "green",
  PENDING: "orange", PENDING_APPROVAL: "orange", UNDER_REVIEW: "orange", WAITING: "orange",
  EXPECTED: "orange", DRAFT: "gray", VOIDED: "gray", CANCELLED: "gray", DISMISSED: "gray",
  EXPIRED: "gray", VACANT: "gray",
  OVERDUE: "red", REJECTED: "red", CRITICAL: "red", FAILED: "red", DENIED: "red",
  OPEN: "blue", SUBMITTED: "blue", ASSIGNED: "blue", IN_PROGRESS: "blue", CHECKED_IN: "blue",
  PARTIAL: "orange", CLOSED: "gray", ACTIONED: "green", POSTED: "green", CALCULATED: "blue",
};
