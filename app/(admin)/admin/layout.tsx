import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole, portalForRole } from "@/lib/permissions";
import { isRoleDisabled } from "@/lib/community-config";
import { db } from "@/lib/db";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmergencyBanner } from "@/components/layout/emergency-banner";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { DemoBadge } from "@/components/layout/demo-badge";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileNavDrawer } from "@/components/admin/mobile-nav";
import { LiveRefresh } from "@/components/system/live-refresh";
import { DisabledPortalScreen } from "@/components/layout/disabled-portal";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect(portalForRole(user.role));
  if (!user.communityId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">This account is not linked to a community.</p>
      </div>
    );
  }
  const communityId = user.communityId;
  if (await isRoleDisabled(communityId, user.role)) {
    return <DisabledPortalScreen role={user.role} />;
  }

  const [community, notifications] = await Promise.all([
    db.community.findUnique({ where: { id: communityId } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  const actions = [
    { id: "a1", title: "Create billing run", hint: "Finance · generate invoices", href: "/admin/finance?tab=billing" },
    { id: "a2", title: "Create announcement", hint: "Community · notify everyone", href: "/admin/community?compose=1" },
    { id: "a3", title: "Create poll", hint: "Community · governance", href: "/admin/community?tab=polls&new=poll" },
    { id: "a4", title: "Create event", hint: "Community · calendar", href: "/admin/community?tab=events&new=event" },
    { id: "a5", title: "Add resident", hint: "Residents · onboarding", href: "/admin/residents?new=1" },
    { id: "a6", title: "Send payment reminders", hint: "Finance · nudge due residents", href: "/admin/finance" },
    { id: "a7", title: "Generate report", hint: "Reports · exports", href: "/admin/reports" },
    { id: "a8", title: "Open settings", hint: "Configuration", href: "/admin/settings" },
    { id: "a9", title: "View audit logs", hint: "Compliance", href: "/admin/audit" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LiveRefresh intervalMs={30_000} />
      <EmergencyBanner communityId={communityId} />
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-[var(--subtle)] sticky top-0 h-screen overflow-y-auto">
          <div className="h-14 flex items-center px-4 border-b border-[var(--border)]">
            <BrandMark href="/admin" size="sm" />
          </div>
          <Sidebar communityName={community?.name ?? ""} />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--border)]">
            <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="lg:hidden">
                  <MobileNavDrawer />
                </div>
                <CommandPalette actions={actions} isAdmin />
              </div>
              <div className="flex items-center gap-1 shrink-0">
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

          <main className="container-wide py-6 flex-1">{children}</main>

          <footer className="border-t border-[var(--border)] py-4 px-6 no-print">
            <p className="text-2xs text-muted-foreground">
              {community?.name} · Community OS demo — every sensitive action is audit-logged.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

