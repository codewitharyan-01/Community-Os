import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/stat";
import { ProfileClient } from "@/components/profile/profile-client";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireCommunityUser();
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: {
      unit: { include: { building: true, community: true, vehicles: true, members: { include: { user: true } } } },
    },
  });

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your details, household and privacy controls." />
      <ProfileClient
        user={{
          name: user.name,
          phone: dbUser?.phone ?? "",
          email: user.email,
          role: user.role,
          emergencyContact: dbUser?.emergencyContact ?? "",
          language: dbUser?.language ?? "en-IN",
          avatarHue: user.avatarHue,
          privacy: JSON.parse(dbUser?.privacy ?? "{}"),
        }}
        membership={
          membership
            ? {
                communityName: membership.unit.community.name,
                buildingName: membership.unit.building.name,
                floor: membership.unit.floor,
                label: membership.unit.label,
                type: membership.type,
                since: formatDate(dbUser?.createdAt ?? new Date()),
              }
            : null
        }
        family={membership?.unit.members.map((m) => ({ id: m.id, name: m.user.name, type: m.type })) ?? []}
        vehicles={membership?.unit.vehicles.map((v) => ({ id: v.id, number: v.number, model: v.model })) ?? []}
      />
    </div>
  );
}
