import { CalendarCheck } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/badge";
import { FacilityCard, CancelBookingButton } from "@/components/facilities/facility-card";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const user = await requireCommunityUser();
  const [facilities, myBookings] = await Promise.all([
    db.facility.findMany({ where: { communityId: user.communityId!, active: true }, orderBy: { name: "asc" } }),
    db.booking.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 10,
      include: { facility: true },
    }),
  ]);

  const upcoming = myBookings.filter((b) => (b.date >= new Date(new Date().toDateString())) && b.status !== "CANCELLED");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Facilities" subtitle="Book shared amenities in a few taps. Availability checks are live." />

      <SectionTitle>Available facilities</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        {facilities.map((f) => (
          <FacilityCard
            key={f.id}
            facility={{
              id: f.id,
              name: f.name,
              description: f.description,
              hourlyFee: f.hourlyFee,
              openHour: f.openHour,
              closeHour: f.closeHour,
              approvalRequired: f.approvalRequired,
              maxPerMonth: f.maxPerMonth,
            }}
          />
        ))}
      </div>

      <SectionTitle>My bookings</SectionTitle>
      {myBookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck className="w-5 h-5" />}
            title="No bookings yet"
            body="Your facility reservations will appear here with their status."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {myBookings.map((b) => (
            <Card key={b.id} className="px-4 py-3.5 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{b.facility.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(b.date)} · {b.startHour}:00–{b.endHour}:00
                  {b.fee > 0 && ` · ${formatINR(b.fee)}`}
                </p>
              </div>
              <StatusBadge status={b.status} />
              {upcoming.some((u) => u.id === b.id) && <CancelBookingButton bookingId={b.id} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
