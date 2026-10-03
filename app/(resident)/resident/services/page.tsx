import Link from "next/link";
import {
  AlertTriangle, DoorOpen, CarFront, CalendarCheck, FileText, Wrench, ChevronRight,
} from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/badge";

export const metadata = { title: "Services" };

const LINKS = [
  { href: "/resident/services/issues", label: "Issues & complaints", desc: "Report and track", icon: AlertTriangle },
  { href: "/resident/services/visitors", label: "Visitors", desc: "QR passes & gate entries", icon: DoorOpen },
  { href: "/resident/services/parking", label: "Parking & vehicles", desc: "Slots, vehicles, lookup", icon: CarFront },
  { href: "/resident/services/facilities", label: "Facilities", desc: "Book clubhouse, courts & more", icon: CalendarCheck },
  { href: "/resident/services/documents", label: "Documents", desc: "Bye-laws, notices & policies", icon: FileText },
];

export default async function ServicesHub() {
  const user = await requireCommunityUser();
  const [openIssues, expectedVisitors, activeBookings, staff] = await Promise.all([
    db.issue.count({ where: { authorId: user.id, status: { notIn: ["CLOSED", "VERIFIED"] } } }),
    db.visitor.count({ where: { hostUserId: user.id, status: "EXPECTED", validTo: { gte: new Date() } } }),
    db.booking.count({ where: { userId: user.id, status: { in: ["CONFIRMED", "PENDING"] }, date: { gte: new Date() } } }),
    db.staff.findMany({
      where: { communityId: user.communityId, active: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
  ]);

  const badges: Record<string, number> = {
    "/resident/services/issues": openIssues,
    "/resident/services/visitors": expectedVisitors,
    "/resident/services/facilities": activeBookings,
  };

  return (
    <div>
      <PageHeader title="Services" subtitle="Everything you need, one tap away." />

      <div className="grid sm:grid-cols-2 gap-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="p-5 hover:shadow-pop transition-shadow flex items-center gap-4 h-full">
              <span className="w-11 h-11 rounded-xl bg-[var(--muted)] flex items-center justify-center shrink-0">
                <l.icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  {l.label}
                  {badges[l.href] > 0 && <StatusBadge status="OPEN" label={String(badges[l.href])} />}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Card>
          </Link>
        ))}
      </div>

      <SectionTitle>Domestic staff directory</SectionTitle>
      <Card className="divide-y divide-[var(--border)]">
        {staff.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No staff registered yet.</p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="px-5 py-3.5 flex items-center gap-3.5">
              <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.name} <span className="text-muted-foreground font-normal">· {s.workType.toLowerCase()}</span>
                </p>
                {s.assignedUnits && <p className="text-2xs text-muted-foreground">Services: {s.assignedUnits}</p>}
              </div>
              <StatusBadge status={s.verification} label={s.verification === "VERIFIED" ? "Verified" : "Pending"} />
            </div>
          ))
        )}
      </Card>
      <p className="text-2xs text-muted-foreground mt-2 px-1">
        Contact details are privacy-protected — staff are Society-verified and reachable through the committee.
      </p>
    </div>
  );
}
