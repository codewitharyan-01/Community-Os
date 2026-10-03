import { Building2, CalendarCheck } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FacilityModal, FacilityToggle } from "@/components/admin/crud";
import { can } from "@/lib/permissions";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatINR, formatDate } from "@/lib/utils";

export const metadata = { title: "Facilities" };

export default async function AdminFacilities() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;

  const [facilities, bookings] = await Promise.all([
    db.facility.findMany({ where: { communityId }, orderBy: { name: "asc" } }),
    db.booking.findMany({
      where: { communityId },
      orderBy: { date: "desc" },
      take: 40,
      include: { facility: true, user: { select: { name: true } }, unit: true },
    }),
  ]);

  const upcomingCount = bookings.filter((b) => b.date >= new Date(new Date().toDateString()) && b.status !== "CANCELLED").length;
  const feeSum = bookings.filter((b) => b.status !== "CANCELLED").reduce((s, b) => s + b.fee, 0);

  return (
    <div>
      <PageHeader
        title="Facilities"
        subtitle="Shared amenities, booking rules and the reservation log."
        action={can(user.role, "facilities.manage") ? <FacilityModal /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Facilities" value={facilities.length} />
        <StatCard label="Upcoming bookings" value={upcomingCount} />
        <StatCard label="Bookings (all time)" value={bookings.length} />
        <StatCard label="Fees booked" value={formatINR(feeSum)} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {facilities.map((f) => (
          <Card key={f.id} className="p-5">
            <div className="flex items-start justify-between">
              <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </span>
              <StatusBadge status={f.active ? "ACTIVE" : "VACANT"} label={f.active ? "Active" : "Disabled"} />
            </div>
            <p className="text-sm font-semibold mt-3">{f.name}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
            <p className="text-2xs text-muted-foreground mt-3">
              {f.openHour}:00–{f.closeHour}:00 · {f.hourlyFee > 0 ? `${formatINR(f.hourlyFee)}/hr` : "free"} · max {f.maxPerMonth}/mo{f.approvalRequired ? " · approval required" : ""}
            </p>
            {can(user.role, "facilities.manage") && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <FacilityToggle id={f.id} active={f.active} />
                <FacilityModal facility={{ id: f.id, name: f.name, description: f.description, hourlyFee: f.hourlyFee, openHour: f.openHour, closeHour: f.closeHour, maxPerMonth: f.maxPerMonth, approvalRequired: f.approvalRequired }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <h2 className="text-2xs font-semibold text-muted-foreground uppercase mb-3">Reservation log</h2>
      <DataTable
        columns={[
          { key: "facility", header: "Facility", render: (r) => <span className="font-medium">{r.facility.name}</span>, mobilePrimary: (r) => <span className="font-medium">{r.facility.name}</span> },
          { key: "resident", header: "Resident", render: (r) => <span className="text-xs">{r.user.name}{r.unit ? ` · ${r.unit.label}` : ""}</span> },
          { key: "when", header: "Slot", render: (r) => <span className="text-xs">{formatDate(r.date)} · {r.startHour}:00–{r.endHour}:00</span>, mobileSecondary: (r) => formatDate(r.date) },
          { key: "fee", header: "Fee", render: (r) => <span className="text-xs num">{r.fee > 0 ? formatINR(r.fee) : "—"}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
        ] as Column<(typeof bookings)[number] & { id: string }>[]}
        rows={bookings}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.facility.name}</p>
            <p className="text-2xs text-muted-foreground">{r.user.name}</p>
          </div>
        )}
        empty={<EmptyState icon={<CalendarCheck className="w-5 h-5" />} title="No bookings yet" body="Reservations from the resident portal appear here." />}
      />
    </div>
  );
}
