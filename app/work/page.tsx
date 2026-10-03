import { redirect } from "next/navigation";
import { ClipboardList, ReceiptText, Briefcase } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { isWorkRole, portalForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { isRoleDisabled } from "@/lib/community-config";
import { DisabledPortalScreen } from "@/components/layout/disabled-portal";
import { LiveRefresh } from "@/components/system/live-refresh";
import { BrandMark } from "@/components/brand/brand-mark";
import { UserMenu } from "@/components/layout/user-menu";
import { EmergencyBanner } from "@/components/layout/emergency-banner";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskStatusSelect } from "@/components/admin/issue-controls";
import { SEVERITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My work" };

export default async function WorkPortal() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isWorkRole(user.role)) redirect(portalForRole(user.role));
  const communityId = user.communityId!;
  if (await isRoleDisabled(communityId, user.role)) {
    return <DisabledPortalScreen role={user.role} />;
  }

  const isVendor = user.role === "VENDOR";
  const vendor = user.vendorId ? await db.vendor.findUnique({ where: { id: user.vendorId } }) : null;

  const tasks = await db.maintenanceTask.findMany({
    where: {
      communityId,
      ...(isVendor && user.vendorId ? { assignedVendorId: user.vendorId } : { assignedToUserId: user.id }),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { asset: { select: { name: true } }, issue: { select: { id: true, title: true } } },
  });

  const myExpenses = vendor
    ? await db.expense.findMany({ where: { communityId, vendorId: vendor.id }, orderBy: { date: "desc" }, take: 10 })
    : [];

  const openTasks = tasks.filter((t) => !["COMPLETED", "VERIFIED"].includes(t.status));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LiveRefresh intervalMs={30_000} />
      <EmergencyBanner communityId={communityId} />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="container-app h-14 flex items-center justify-between">
          <BrandMark href="/work" size="sm" />
          <UserMenu name={user.name} role={user.role} email={user.email} />
        </div>
      </header>

      <main className="container-app py-6 flex-1">
        <PageHeader
          title={`My work — ${vendor?.company ?? user.name}`}
          subtitle={isVendor ? "Assigned service tasks and your invoice status." : "Your maintenance assignments."}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Open tasks" value={openTasks.length} tone={openTasks.length > 0 ? "orange" : "green"} />
          <StatCard label="Completed" value={tasks.filter((t) => ["COMPLETED", "VERIFIED"].includes(t.status)).length} />
          <StatCard label="Role" value={isVendor ? "Vendor" : "Staff"} />
          <StatCard label="Contract" value={vendor ? (vendor.contractEnd ? formatDate(vendor.contractEnd) : "—") : "—"} sub={vendor ? "contract end" : undefined} />
        </div>

        <h2 className="text-2xs font-semibold text-muted-foreground uppercase mb-3">Assigned tasks</h2>
        {tasks.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ClipboardList className="w-5 h-5" />}
              title="No tasks assigned"
              body="When the society assigns you a task, it appears here with location, priority and due date."
            />
          </Card>
        ) : (
          <div className="space-y-2.5 mb-8">
            {tasks.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{t.title}</p>
                    <StatusBadge status={t.priority === "CRITICAL" ? "CRITICAL" : "OPEN"} label={SEVERITY_LABELS[t.priority]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.location || "—"}{t.asset ? ` · ${t.asset.name}` : ""} · {t.dueDate ? `due ${formatDate(t.dueDate)}` : "no due date"}
                  </p>
                  {t.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>}
                </div>
                <TaskStatusSelect taskId={t.id} current={t.status} />
              </Card>
            ))}
          </div>
        )}

        {isVendor && (
          <>
            <h2 className="text-2xs font-semibold text-muted-foreground uppercase mb-3">My invoices</h2>
            {myExpenses.length === 0 ? (
              <Card>
                <EmptyState icon={<ReceiptText className="w-5 h-5" />} title="No invoices submitted" body="Bills submitted by the committee for your services appear here with payment status." />
              </Card>
            ) : (
              <div className="space-y-2">
                {myExpenses.map((e) => (
                  <Card key={e.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(e.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold num">₹{e.amount.toLocaleString("en-IN")}</p>
                      <p className="text-2xs text-muted-foreground">{TASK_STATUS_LABELS[e.status] ? "" : ""}{e.status.replace(/_/g, " ").toLowerCase()}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </Card>
                ))}
              </div>
            )}
            <p className="text-2xs text-muted-foreground mt-4 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> Invoices are submitted through the society committee; payment status updates automatically.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
