"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { visitorSchema, vehicleSchema, bookingSchema, zodErrors, type FieldErrors } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { randomCode, addDays, maskName } from "@/lib/utils";

// ─── Visitors ─────────────────────────────────────────────────────────────────

export type VisitorState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; passCode?: string; qrDataUrl?: string };

export async function inviteVisitor(_prev: VisitorState, formData: FormData): Promise<VisitorState> {
  const user = await requireCommunityUser();
  const parsed = visitorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    vehicleNumber: formData.get("vehicleNumber") ?? "",
    purpose: formData.get("purpose") ?? "",
    type: formData.get("type") ?? "GUEST",
    date: formData.get("date"),
    time: formData.get("time"),
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const membership = await db.membership.findFirst({ where: { userId: user.id }, include: { unit: true } });
  if (!membership) return { error: "You need to be linked to a unit to invite visitors." };

  const validFrom = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (isNaN(validFrom.getTime())) return { error: "Invalid date or time" };

  const passCode = randomCode("VIS");
  await db.visitor.create({
    data: {
      communityId: user.communityId,
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
      vehicleNumber: parsed.data.vehicleNumber?.toUpperCase() ?? "",
      purpose: parsed.data.purpose ?? "",
      type: parsed.data.type,
      hostUserId: user.id,
      unitId: membership.unitId,
      passCode,
      validFrom,
      validTo: addDays(validFrom, 1),
    },
  });

  await notify({
    userIds: await userIds_of_security(user.communityId),
    communityId: user.communityId,
    type: "VISITOR",
    title: `Visitor expected: ${parsed.data.name}`,
    body: `${membership.unit.label} · pass ${passCode} · ${validFrom.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`,
    link: "/security",
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "VISITOR_INVITED", entity: "Visitor", entityId: passCode, summary: `${parsed.data.name} for ${membership.unit.label}` });
  revalidatePath("/resident/services/visitors");
  revalidatePath("/security");

  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(passCode, { width: 360, margin: 1 });
  return { ok: true, passCode, qrDataUrl };
}

async function userIds_of_security(communityId: string): Promise<string[]> {
  const guards = await db.user.findMany({
    where: { communityId, role: { in: ["SECURITY_GUARD", "SECURITY_MANAGER"] }, active: true },
    select: { id: true },
  });
  return guards.map((g) => g.id);
}

export async function cancelVisitorPass(passId: string) {
  const user = await requireCommunityUser();
  const visitor = await db.visitor.findUnique({ where: { id: passId } });
  if (!visitor || visitor.communityId !== user.communityId || visitor.hostUserId !== user.id) {
    throw new Error("Pass not found");
  }
  if (visitor.status !== "EXPECTED") throw new Error("Only expected visits can be cancelled");
  await db.visitor.update({ where: { id: passId }, data: { status: "EXPIRED" } });
  revalidatePath("/resident/services/visitors");
}

// ─── Vehicles & parking ───────────────────────────────────────────────────────

export type VehicleState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors };

export async function addVehicle(_prev: VehicleState, formData: FormData): Promise<VehicleState> {
  const user = await requireCommunityUser();
  const parsed = vehicleSchema.safeParse({
    number: formData.get("number"),
    type: formData.get("type") ?? "CAR",
    model: formData.get("model") ?? "",
    color: formData.get("color") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const existing = await db.vehicle.findUnique({ where: { number: parsed.data.number } });
  if (existing) return { error: "A vehicle with this number is already registered." };

  const membership = await db.membership.findFirst({ where: { userId: user.id } });
  await db.vehicle.create({
    data: {
      communityId: user.communityId,
      userId: user.id,
      unitId: membership?.unitId,
      number: parsed.data.number,
      type: parsed.data.type,
      model: parsed.data.model ?? "",
      color: parsed.data.color ?? "",
    },
  });
  await logAudit({ actor: user, communityId: user.communityId, action: "VEHICLE_ADDED", entity: "Vehicle", entityId: parsed.data.number });
  revalidatePath("/resident/services/parking");
  return { ok: true };
}

export async function removeVehicle(vehicleId: string) {
  const user = await requireCommunityUser();
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.communityId !== user.communityId) throw new Error("Vehicle not found");
  if (vehicle.userId !== user.id) throw new Error("You can only remove your own vehicles");
  await db.vehicle.delete({ where: { id: vehicleId } });
  await logAudit({ actor: user, communityId: user.communityId, action: "VEHICLE_REMOVED", entity: "Vehicle", entityId: vehicle.number });
  revalidatePath("/resident/services/parking");
}

export async function lookupVehicle(_prev: unknown, formData: FormData) {
  const user = await requireCommunityUser();
  const raw = String(formData.get("number") ?? "").toUpperCase().replace(/\s+/g, "");
  if (!raw) return { result: null, error: "Enter a vehicle number" };

  const vehicle = await db.vehicle.findUnique({
    where: { number: raw },
    include: {
      unit: { include: { parkingSlots: true } },
    },
  });

  // Privacy-aware: log the lookup, mask the owner, never expose the phone.
  await logAudit({
    actor: user,
    communityId: user.communityId,
    action: "VEHICLE_LOOKUP",
    entity: "Vehicle",
    entityId: raw,
    summary: `${user.name} looked up ${raw}`,
  });

  if (!vehicle || vehicle.communityId !== user.communityId) {
    return { result: null, error: "No vehicle found with this number in your community." };
  }

  const owner = vehicle.userId
    ? await db.user.findUnique({ where: { id: vehicle.userId }, select: { name: true } })
    : vehicle.unit
      ? await db.membership.findFirst({ where: { unitId: vehicle.unit.id, type: "OWNER" }, select: { user: { select: { name: true } } } }).then((m) => (m ? { name: m.user.name } : null))
      : null;

  return {
    result: {
      number: vehicle.number,
      model: vehicle.model,
      color: vehicle.color,
      type: vehicle.type,
      unitLabel: vehicle.unit?.label ?? "—",
      slots: vehicle.unit?.parkingSlots.map((s) => s.code) ?? [],
      ownerMasked: owner ? maskName(owner.name) : "Unregistered",
      vehicleId: vehicle.id,
    },
    error: null,
  };
}

export async function notifyVehicleOwner(vehicleId: string, note: string) {
  const user = await requireCommunityUser();
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    include: { unit: { include: { members: true } } },
  });
  if (!vehicle || vehicle.communityId !== user.communityId) throw new Error("Vehicle not found");

  const targets = [
    ...(vehicle.unit?.members.map((m) => m.userId) ?? []),
    ...(vehicle.userId ? [vehicle.userId] : []),
  ].filter(Boolean);

  await notify({
    userIds: targets as string[],
    communityId: user.communityId,
    type: "PARKING",
    title: `Vehicle request: ${vehicle.number}`,
    body: note.trim() || `${user.name} is requesting to connect with you regarding this vehicle.`,
    link: "/resident/services/parking",
    priority: "HIGH",
  });

  await logAudit({
    actor: user,
    communityId: user.communityId,
    action: "VEHICLE_OWNER_NOTIFIED",
    entity: "Vehicle",
    entityId: vehicle.number,
    summary: `${user.name} notified the owner of ${vehicle.number}`,
  });
  revalidatePath("/resident/services/parking");
}

// ─── Facility bookings ────────────────────────────────────────────────────────

export type BookingState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; message?: string };

export async function bookFacility(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const user = await requireCommunityUser();
  const parsed = bookingSchema.safeParse({
    facilityId: formData.get("facilityId"),
    date: formData.get("date"),
    startHour: formData.get("startHour"),
    hours: formData.get("hours") ?? 1,
  });
  if (!parsed.success) return { fieldErrors: zodErrors(parsed.error) };

  const facility = await db.facility.findUnique({ where: { id: parsed.data.facilityId } });
  if (!facility || facility.communityId !== user.communityId || !facility.active) {
    return { error: "Facility not available." };
  }

  const date = new Date(`${parsed.data.date}T00:00:00`);
  const start = parsed.data.startHour;
  const end = start + parsed.data.hours;

  if (start < facility.openHour || end > facility.closeHour) {
    return { error: `Open hours: ${facility.openHour}:00–${facility.closeHour}:00.` };
  }
  const maxH = 6;
  if (parsed.data.hours > maxH) return { error: `Maximum ${maxH} hours per booking.` };

  // Monthly limit per user
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthCount = await db.booking.count({
    where: { userId: user.id, facilityId: facility.id, date: { gte: monthStart, lt: new Date(date.getFullYear(), date.getMonth() + 1, 1) }, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } },
  });
  if (monthCount >= facility.maxPerMonth) {
    return { error: `You've reached the monthly limit of ${facility.maxPerMonth} bookings for ${facility.name}.` };
  }

  // Availability check — no overlapping active bookings
  const sameDay = await db.booking.findMany({
    where: { facilityId: facility.id, date, status: { in: ["CONFIRMED", "PENDING"] } },
  });
  const conflict = sameDay.some((b) => start < b.endHour && b.startHour < end);
  if (conflict) return { error: "That time slot overlaps an existing booking. Pick another slot." };

  const membership = await db.membership.findFirst({ where: { userId: user.id } });
  const booking = await db.booking.create({
    data: {
      communityId: user.communityId,
      facilityId: facility.id,
      userId: user.id,
      unitId: membership?.unitId,
      date,
      startHour: start,
      endHour: end,
      fee: facility.hourlyFee * parsed.data.hours,
      status: facility.approvalRequired ? "PENDING" : "CONFIRMED",
    },
  });

  await logAudit({ actor: user, communityId: user.communityId, action: "FACILITY_BOOKED", entity: "Booking", entityId: booking.id, summary: `${facility.name} on ${parsed.data.date} ${start}:00–${end}:00` });
  revalidatePath("/resident/services/facilities");
  return {
    ok: true,
    message: facility.approvalRequired
      ? "Booking requested — awaiting facility manager approval."
      : `Booked ${facility.name} for ${parsed.data.date}, ${start}:00–${end}:00.`,
  };
}

export async function cancelBooking(bookingId: string) {
  const user = await requireCommunityUser();
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.communityId !== user.communityId) throw new Error("Booking not found");
  if (booking.userId !== user.id) throw new Error("You can only cancel your own bookings");
  if (booking.status === "CANCELLED") return;
  await db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
  await logAudit({ actor: user, communityId: user.communityId, action: "BOOKING_CANCELLED", entity: "Booking", entityId: bookingId });
  revalidatePath("/resident/services/facilities");
}
