import { CarFront } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/stat";
import { VehicleLookup, AddVehicleModal, RemoveVehicleButton } from "@/components/parking/parking-client";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Parking & vehicles" };

export default async function ParkingPage() {
  const user = await requireCommunityUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: {
      unit: { include: { parkingSlots: true, vehicles: true } },
    },
  });

  const slots = membership?.unit.parkingSlots ?? [];
  const vehicles = membership?.unit.vehicles ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Parking & vehicles"
        subtitle={membership ? `Registered to ${membership.unit.label}` : "Link yourself to a unit first"}
      />

      <SectionTitle>My vehicles</SectionTitle>
      {vehicles.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CarFront className="w-5 h-5" />}
            title="No vehicles registered"
            body="Register your vehicles so security can identify them instantly."
            action={<AddVehicleModal />}
          />
        </Card>
      ) : (
        <div className="space-y-2 mb-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="px-4 py-3.5 flex items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center shrink-0">
                <CarFront className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold font-mono">{v.number}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[v.model, v.color, humanize(v.type)].filter(Boolean).join(" · ") || "Vehicle"}
                </p>
              </div>
              <RemoveVehicleButton vehicleId={v.id} />
            </Card>
          ))}
        </div>
      )}
      {vehicles.length > 0 && <div className="mb-2"><AddVehicleModal /></div>}

      <SectionTitle>My parking slots</SectionTitle>
      {slots.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">
            No dedicated slot assigned to your unit. The facility manager assigns slots — visitor parking is available near the gate.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {slots.map((s) => (
            <Card key={s.id} className="p-4 text-center">
              <p className="font-mono text-lg font-semibold">{s.code}</p>
              <p className="text-2xs text-muted-foreground mt-1">{s.area} · {humanize(s.type)}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6">
        <VehicleLookup />
      </div>
    </div>
  );
}
