import Link from "next/link";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { AssignIssueDialog, IssueStatusSelect, TaskStatusSelect } from "@/components/admin/issue-controls";
import { TaskModal } from "@/components/admin/admin-client";
import { TaskRowActions } from "@/components/admin/crud";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS, SEVERITY_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Issues & Tasks" };

export default async function AdminIssues({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCommunityUser();
  const { tab } = await searchParams;
  const active = tab ?? "issues";

  const [openCount, taskCount] = await Promise.all([
    db.issue.count({ where: { communityId: user.communityId!, status: { notIn: ["CLOSED"] } } }),
    db.maintenanceTask.count({ where: { communityId: user.communityId!, status: { notIn: ["VERIFIED", "COMPLETED"] } } }),
  ]);

  return (
    <div>
      <PageHeader title="Issues & Tasks" subtitle="Priority queue, assignments, SLAs and the maintenance board." />
      <Tabs
        tabs={[
          { id: "issues", label: "Issues", count: openCount },
          { id: "tasks", label: "Maintenance tasks", count: taskCount },
        ]}
        className="mb-6"
      />
      {active === "issues" ? <IssuesQueue /> : <TasksBoard />}
    </div>
  );
}

// ─── Issues queue ─────────────────────────────────────────────────────────────

async function IssuesQueue() {
  const user = await requireCommunityUser();
  const canAssign = can(user.role, "issues.assign");

  const [issues, staff, vendors] = await Promise.all([
    db.issue.findMany({
      where: { communityId: user.communityId! },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } }, assignedToUser: { select: { name: true } }, assignedVendor: { select: { company: true } } },
    }),
    db.user.findMany({ where: { communityId: user.communityId!, role: { in: ["MAINTENANCE_STAFF"] }, active: true }, select: { id: true, name: true } }),
    db.vendor.findMany({ where: { communityId: user.communityId! }, select: { id: true, company: true } }),
  ]);

  // Priority score: severity weight + votes + age + admin boost
  const severityWeight: Record<string, number> = { CRITICAL: 50, HIGH: 30, MEDIUM: 12, LOW: 4 };
  const scored = issues
    .filter((i) => i.status !== "CLOSED")
    .map((i) => {
      const ageHours = (Date.now() - i.createdAt.getTime()) / 3600000;
      const score = (severityWeight[i.severity] ?? 10) + i.upvoteCount * 2 + Math.min(ageHours / 24, 7) * 3 + i.adminBoost;
      return { issue: i, score: Math.round(score) };
    })
    .sort((a, b) => b.score - a.score);
  const closed = issues.filter((i) => i.status === "CLOSED");

  type Row = (typeof issues)[number] & { id: string };

  const columns: Column<Row>[] = [
    {
      key: "title",
      header: "Issue",
      render: (r) => (
        <div className="min-w-0 max-w-md">
          <Link href={`/resident/services/issues/${r.id}`} className="font-medium hover:underline underline-offset-2 block truncate">{r.title}</Link>
          <p className="text-xs text-muted-foreground mt-0.5">{ISSUE_CATEGORY_LABELS[r.category] ?? r.category}{r.location ? ` · ${r.location}` : ""} · {r.author.name}</p>
        </div>
      ),
      mobilePrimary: (r) => <span className="font-medium">{r.title}</span>,
      mobileSecondary: (r) => <span className="text-muted-foreground">{ISSUE_CATEGORY_LABELS[r.category] ?? r.category}</span>,
    },
    { key: "severity", header: "Severity", render: (r) => <StatusBadge status={r.severity === "CRITICAL" ? "CRITICAL" : r.severity === "HIGH" ? "OVERDUE" : "OPEN"} label={SEVERITY_LABELS[r.severity]} />, mobileRight: (r) => <StatusBadge status={r.severity === "CRITICAL" ? "CRITICAL" : "OPEN"} label={SEVERITY_LABELS[r.severity]} /> },
    { key: "votes", header: "Votes", render: (r) => <span className="text-xs num">{r.upvoteCount}</span> },
    { key: "sla", header: "SLA", render: (r) => <span className="text-xs">{r.slaHours}h</span> },
    { key: "status", header: "Status", render: (r) => <IssueStatusSelect issueId={r.id} current={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
    {
      key: "assignee",
      header: "Assigned to",
      render: (r) => (
        <span className="text-xs">{r.assignedToUser?.name ?? r.assignedVendor?.company ?? <span className="text-muted-foreground">Unassigned</span>}</span>
      ),
    },
    ...(canAssign
      ? [{
          key: "actions", header: "",
          render: (r: Row) =>
            r.status === "SUBMITTED" || r.status === "UNDER_REVIEW" ? (
              <AssignIssueDialog issueId={r.id} staff={staff} vendors={vendors} />
            ) : null,
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        rows={scored.map((s) => s.issue)}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium leading-snug">{r.title}</p>
            <p className="text-2xs text-muted-foreground">{SEVERITY_LABELS[r.severity]} · {ISSUE_STATUS_LABELS[r.status]} · {relativeTime(r.createdAt)}</p>
          </div>
        )}
        empty={<EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Queue is clear" body="No open issues — every reported problem has been closed out." />}
      />

      {closed.length > 0 && (
        <>
          <h2 className="text-2xs font-semibold text-muted-foreground uppercase">Recently closed</h2>
          <div className="space-y-2">
            {closed.slice(0, 5).map((i) => (
              <Card key={i.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm flex-1 min-w-0 truncate">{i.title}</span>
                <StatusBadge status={i.status} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tasks board ──────────────────────────────────────────────────────────────

async function TasksBoard() {
  const user = await requireCommunityUser();
  const canManage = can(user.role, "tasks.manage");

  const [tasks, staff, vendors, assets] = await Promise.all([
    db.maintenanceTask.findMany({
      where: { communityId: user.communityId! },
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { name: true } }, vendor: { select: { company: true } }, asset: { select: { name: true } } },
    }),
    db.user.findMany({ where: { communityId: user.communityId!, role: "MAINTENANCE_STAFF", active: true }, select: { id: true, name: true } }),
    db.vendor.findMany({ where: { communityId: user.communityId! }, select: { id: true, company: true } }),
    db.asset.findMany({ where: { communityId: user.communityId! }, select: { id: true, name: true } }),
  ]);

  type Row = (typeof tasks)[number] & { id: string };
  const columns: Column<Row>[] = [
    {
      key: "title", header: "Task",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.location || "—"}{r.asset ? ` · ${r.asset.name}` : ""}</p>
        </div>
      ),
      mobilePrimary: (r) => <span className="font-medium">{r.title}</span>,
      mobileSecondary: (r) => <span className="text-muted-foreground">{r.location || "—"}</span>,
    },
    { key: "priority", header: "Priority", render: (r) => <StatusBadge status={r.priority === "CRITICAL" ? "CRITICAL" : "OPEN"} label={SEVERITY_LABELS[r.priority]} />, mobileRight: (r) => <StatusBadge status={r.priority === "CRITICAL" ? "CRITICAL" : "OPEN"} label={SEVERITY_LABELS[r.priority]} /> },
    { key: "assignee", header: "Assigned", render: (r) => <span className="text-xs">{r.assignee?.name ?? r.vendor?.company ?? <span className="text-muted-foreground">Unassigned</span>}</span> },
    { key: "status", header: "Status", render: (r) => <TaskStatusSelect taskId={r.id} current={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
    {
      key: "taskActions", header: "",
      render: (r: Row) => (
        <TaskRowActions
          task={{ id: r.id, title: r.title, priority: r.priority, dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null, assignedToUserId: r.assignedToUserId }}
          staff={staff}
        />
      ),
    },
  ];

  return (
    <div>
      {canManage && (
        <div className="mb-4">
          <TaskModal staff={staff} vendors={vendors} assets={assets} />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={tasks}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-2xs text-muted-foreground">{r.assignee?.name ?? r.vendor?.company ?? "Unassigned"}</p>
          </div>
        )}
        empty={
          <EmptyState
            icon={<ClipboardList className="w-5 h-5" />}
            title="No maintenance tasks"
            body="Create tasks manually, or generate them from asset service schedules in Assets."
          />
        }
      />
    </div>
  );
}
