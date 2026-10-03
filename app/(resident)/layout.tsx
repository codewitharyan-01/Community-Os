import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isResidentRole, portalForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmergencyBanner } from "@/components/layout/emergency-banner";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { BottomNav, QuickActionsFab } from "@/components/resident/nav";
import { LiveRefresh } from "@/components/system/live-refresh";
import { DemoBadge } from "@/components/layout/demo-badge";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isResidentRole(user.role)) redirect(portalForRole(user.role));
  if (!user.communityId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">This account is not linked to a community.</p>
      </div>
    );
  }
  const communityId = user.communityId;
  const community = await db.community.findUnique({ where: { id: communityId } });

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0 flex flex-col">
      <LiveRefresh intervalMs={45_000} />
      <EmergencyBanner communityId={communityId} />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="container-app h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark href="/resident" size="sm" />
            <span className="hidden md:inline-flex items-center text-2xs text-muted-foreground border border-[var(--border)] rounded-full px-2.5 py-1 truncate max-w-[220px]">
              {community?.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DemoBadge />
            <NotificationsBell
              initial={notifications.map((n) => ({
                id: n.id, type: n.type, title: n.title, body: n.body,
                link: n.link, read: n.read, priority: n.priority, createdAt: n.createdAt.toISOString(),
              }))}
            />
            <UserMenu name={user.name} role={user.role} email={user.email} />
          </div>
        </div>
      </header>

      <main className="container-app py-6 flex-1">{children}</main>

      <QuickActionsFab />
      <BottomNav />
    </div>
  );
}
