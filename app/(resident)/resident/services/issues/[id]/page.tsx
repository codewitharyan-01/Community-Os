import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/stat";
import { IssueEngagement } from "@/components/issues/issue-engagement";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS, SEVERITY_LABELS } from "@/lib/constants";
import { formatDateTime, relativeTime } from "@/lib/utils";

export default async function IssueDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCommunityUser();
  const { id } = await params;
  const issue = await db.issue.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatarHue: true } },
      assignedToUser: { select: { name: true } },
      assignedVendor: { select: { company: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, avatarHue: true } } } },
      votes: { where: { userId: user.id } },
      timeline: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!issue || issue.communityId !== user.communityId) notFound();

  const flow = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFIED"];
  const activeIdx = flow.indexOf(issue.status);
  const age = Math.floor((Date.now() - issue.createdAt.getTime()) / 3600000);
  const slaBreached = issue.status !== "CLOSED" && age > issue.slaHours && !issue.resolvedAt;

  return (
    <div className="max-w-3xl">
      <Link href="/resident/services/issues" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All issues
      </Link>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight">{issue.title}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            #{issue.id.slice(-6).toUpperCase()} · reported {relativeTime(issue.createdAt)} by {issue.author.name}
          </p>
        </div>
        <StatusBadge status={issue.status} />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <StatusBadge status="OPEN" label={ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category} />
        <StatusBadge status={issue.severity === "CRITICAL" ? "CRITICAL" : "OPEN"} label={`${SEVERITY_LABELS[issue.severity]} severity`} />
        {issue.location && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-[var(--border)] rounded-full px-2.5 py-1">
            <MapPin className="w-3 h-3" /> {issue.location}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-1 ${slaBreached ? "text-[var(--status-red)] bg-[var(--status-red-bg)] border-transparent" : "text-muted-foreground border-[var(--border)]"}`}>
          <Clock className="w-3 h-3" /> SLA {issue.slaHours}h {slaBreached ? "· breached" : ""}
        </span>
      </div>

      {/* Progress stepper */}
      <Card className="p-5 mb-5">
        <div className="flex items-center">
          {flow.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${i <= activeIdx ? "bg-[#0a0a0a] border-[#0a0a0a]" : "bg-white border-[var(--border-strong)]"}`} />
                <span className={`text-2xs mt-1.5 whitespace-nowrap ${i <= activeIdx ? "font-medium" : "text-muted-foreground"}`}>
                  {ISSUE_STATUS_LABELS[s]}
                </span>
              </div>
              {i < flow.length - 1 && <div className={`h-0.5 flex-1 mx-1 -mt-4 ${i < activeIdx ? "bg-[#0a0a0a]" : "bg-[var(--border)]"}`} />}
            </div>
          ))}
        </div>
        {(issue.assignedToUser || issue.assignedVendor) && (
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-[var(--border)]">
            Handled by: <span className="font-medium text-foreground">{issue.assignedToUser?.name ?? issue.assignedVendor?.company}</span>
          </p>
        )}
      </Card>

      <Card className="mb-5">
        <CardBody className="pt-5">
          <p className="text-sm leading-relaxed whitespace-pre-line">{issue.description}</p>
          {issue.attachmentPath && (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads served via authenticated API route; next/image adds no value here
            <img
              src={`/api/files/${issue.attachmentPath}`}
              alt="Issue attachment"
              className="mt-4 rounded-xl border border-[var(--border)] max-h-80 w-auto"
            />
          )}
        </CardBody>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
          <CardBody>
            <Timeline
              items={issue.timeline.map((t) => ({
                title: t.note || `${ISSUE_STATUS_LABELS[t.fromStatus] ?? t.fromStatus} → ${ISSUE_STATUS_LABELS[t.toStatus] ?? t.toStatus}`,
                meta: `${t.actorName} · ${formatDateTime(t.createdAt)}`,
                active: t.toStatus === issue.status,
                last: false,
              }))}
            />
          </CardBody>
        </Card>

        <div>
          <IssueEngagement
            issueId={issue.id}
            upvoteCount={issue.upvoteCount}
            hasVoted={issue.votes.length > 0}
            canVerify={issue.authorId === user.id && issue.status === "RESOLVED"}
            isMine={issue.authorId === user.id}
            comments={issue.comments.map((c) => ({
              id: c.id,
              body: c.body,
              authorName: c.user.name,
              authorHue: c.user.avatarHue,
              createdAt: c.createdAt.toISOString(),
              internal: c.internal,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
