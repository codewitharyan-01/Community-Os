import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { isGuardRole, portalForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { isRoleDisabled } from "@/lib/community-config";
import { DisabledPortalScreen } from "@/components/layout/disabled-portal";
import { LiveRefresh } from "@/components/system/live-refresh";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmergencyBanner } from "@/components/layout/emergency-banner";
import { UserMenu } from "@/components/layout/user-menu";
import { Card } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { LogIn } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CheckInPanel, WalkInPanel, DeliveryPanel, CheckOutButton, GateVehicleLookup, GateEmergencyControls,
} from "@/components/security/gate-client";
import { VISITOR_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Gate desk" };

export default async function SecurityPortal() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isGuardRole(user.role)) redirect(portalForRole(user.role));
  const communityId = user.communityId!;
  if (await isRoleDisabled(communityId, user.role)) {
    return <DisabledPortalScreen role={user.role} />;
  }

  const todayStart = new Date(new Date().toDateString());
  const endOfToday = new Date(todayStart.getTime() + 86400000);

  const [todayVisitors, activeVisitors, deliveries, incidents] = await Promise.all([
    db.visitor.count({ where: { communityId, checkedInAt: { gte: todayStart, lt: endOfToday } } }),
    db.visitor.findMany({
      where: { communityId, status: "CHECKED_IN" },
      orderBy: { checkedInAt: "desc" },
      include: { unit: true },
    }),
    db.visitor.count({ where: { communityId, type: "DELIVERY", checkedInAt: { gte: todayStart, lt: endOfToday } } }),
    db.securityIncident.count({ where: { communityId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
  ]);

  const expectedToday = await db.visitor.findMany({
    where: { communityId, status: "EXPECTED", validTo: { gte: new Date() } },
    orderBy: { validFrom: "asc" },
    take: 10,
    include: { unit: true, host: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LiveRefresh intervalMs={20_000} />
      <EmergencyBanner communityId={communityId} />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="container-app h-14 flex items-center justify-between">
          <BrandMark href="/security" size="sm" />
          <div className="flex items-center gap-2">
            <GateEmergencyControls />
            <UserMenu name={user.name} role={user.role} email={user.email} />
          </div>
        </div>
      </header>

      <main className="container-app py-6 flex-1">
        <PageHeader title={`Gate desk — ${user.name}`} subtitle="Check visitors in and out, log deliveries, verify vehicles, raise incidents." />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Checked in today" value={todayVisitors} />
          <StatCard label="On premises now" value={activeVisitors.length} tone={activeVisitors.length > 0 ? "orange" : "green"} />
          <StatCard label="Deliveries today" value={deliveries} />
          <StatCard label="Open incidents" value={incidents} tone={incidents > 0 ? "red" : "green"} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <CheckInPanel />
            <GateVehicleLookup />
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <p className="text-sm font-semibold tracking-tight">On premises now</p>
              <div className="flex gap-2">
                <WalkInPanel />
                <DeliveryPanel />
              </div>
            </div>
            {activeVisitors.length === 0 ? (
              <EmptyState icon={<LogIn />} title="No visitors on premises" body="Checked-in visitors appear here with a one-tap check-out." />
            ) : (
              <div className="space-y-2.5">
                {activeVisitors.map((v) => (
                  <div key={v.id} className="rounded-xl border border-[var(--border)] p-3.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{v.name} <span className="text-muted-foreground font-normal">· {VISITOR_TYPE_LABELS[v.type] ?? v.type}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.unit?.label ?? "—"} · in at {formatDateTime(v.checkedInAt)}
                      </p>
                    </div>
                    <CheckOutButton visitorId={v.id} name={v.name} />
                  </div>
                ))}
              </div>
            )}

            <p className="text-2xs font-semibold text-muted-foreground uppercase mt-6 mb-2.5">Expected today</p>
            {expectedToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expected visitors for the rest of today.</p>
            ) : (
              <div className="space-y-1.5">
                {expectedToday.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg bg-[var(--subtle)] border border-[var(--border)]">
                    <span className="min-w-0 truncate">
                      {v.name} <span className="text-muted-foreground">· {v.unit?.label ?? "—"} · {v.host?.name ?? ""}</span>
                    </span>
                    <span className="font-mono text-2xs text-muted-foreground shrink-0">{v.passCode}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <p className="text-2xs text-muted-foreground mt-8">
          Tip: residents are notified the moment their guests are checked in. Every gate action is audit-logged.{" "}
          <Link href="/resident" className="underline underline-offset-2">Resident portal →</Link>
        </p>
      </main>
    </div>
  );
}

