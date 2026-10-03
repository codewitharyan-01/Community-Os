import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const issueSchema = z.object({
  title: z.string().min(5, "Title should be at least 5 characters").max(120),
  description: z.string().min(10, "Describe the issue in a bit more detail").max(2000),
  category: z.string().min(1, "Pick a category"),
  location: z.string().max(120).optional().default(""),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export const visitorSchema = z.object({
  name: z.string().min(2, "Visitor name is required").max(80),
  phone: z.string().max(20).optional().default(""),
  vehicleNumber: z.string().max(20).optional().default(""),
  purpose: z.string().max(120).optional().default(""),
  type: z.enum(["GUEST", "DELIVERY", "CAB", "CONTRACTOR", "STAFF"]).default("GUEST"),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
});

export const vehicleSchema = z.object({
  number: z.string().min(6, "Enter a valid registration number").max(15).transform((s) => s.toUpperCase().replace(/\s+/g, "")),
  type: z.enum(["CAR", "BIKE", "SCOOTER", "EV", "BICYCLE", "OTHER"]).default("CAR"),
  model: z.string().max(60).optional().default(""),
  color: z.string().max(30).optional().default(""),
});

export const postSchema = z.object({
  type: z.enum(["ANNOUNCEMENT", "SUGGESTION", "EVENT", "LOST_FOUND", "ALERT", "APPRECIATION", "DISCUSSION"]).default("DISCUSSION"),
  title: z.string().max(120).optional().default(""),
  body: z.string().min(1, "Write something first").max(3000),
});

export const pollSchema = z.object({
  question: z.string().min(6, "Question is required").max(200),
  description: z.string().max(1000).optional().default(""),
  kind: z.enum(["INFORMAL", "OFFICIAL"]).default("INFORMAL"),
  days: z.coerce.number().int().min(1).max(90).default(7),
  options: z.array(z.string().min(1).max(80)).min(2, "At least two options").max(6),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(120),
  type: z.enum(["EVENT", "FESTIVAL", "MEETING", "MAINTENANCE"]).default("EVENT"),
  description: z.string().max(2000).optional().default(""),
  location: z.string().max(120).optional().default(""),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  budget: z.coerce.number().int().min(0).max(100000000).default(0),
  volunteerSlots: z.coerce.number().int().min(0).max(200).default(0),
});

export const bookingSchema = z.object({
  facilityId: z.string().min(1),
  date: z.string().min(1),
  startHour: z.coerce.number().int().min(0).max(23),
  hours: z.coerce.number().int().min(1).max(6).default(1),
});

export const expenseSchema = z.object({
  vendorId: z.string().optional().default(""),
  category: z.string().min(1, "Pick a category"),
  description: z.string().min(3, "Description is required").max(300),
  amount: z.coerce.number().int().min(1, "Amount must be positive").max(100000000),
  date: z.string().min(1),
});

export const residentSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional().default(""),
  role: z.enum(["OWNER", "TENANT", "FAMILY_MEMBER"]).default("OWNER"),
  unitId: z.string().min(1, "Select a unit"),
  password: z.string().min(8, "Min 8 characters").max(64).optional().default(""),
});

export const billingRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
  maintenance: z.coerce.number().int().min(0),
  parking: z.coerce.number().int().min(0).default(0),
  water: z.coerce.number().int().min(0).default(0),
  sinkingFund: z.coerce.number().int().min(0).default(0),
  repairFund: z.coerce.number().int().min(0).default(0),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  buildingId: z.string().optional().default(""),
});

export const announcementSchema = postSchema;

export const emergencySchema = z.object({
  type: z.enum(["FIRE", "MEDICAL", "SECURITY", "FLOOD", "POWER", "OTHER"]),
  message: z.string().min(5, "Describe the emergency").max(500),
});

export const incidentSchema = z.object({
  type: z.enum(["FIRE", "MEDICAL", "SECURITY", "FLOOD", "POWER", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional().default(""),
  location: z.string().max(120).optional().default(""),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().max(20).optional().default(""),
  emergencyContact: z.string().max(120).optional().default(""),
  language: z.string().max(10).default("en-IN"),
});

export const taskSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional().default(""),
  location: z.string().max(120).optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate: z.string().optional().default(""),
  assignedToUserId: z.string().optional().default(""),
  assignedVendorId: z.string().optional().default(""),
  assetId: z.string().optional().default(""),
});

export type FieldErrors = Record<string, string>;

export function zodErrors(e: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of e.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
