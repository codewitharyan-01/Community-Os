import { Megaphone, ShieldAlert, Vote, CalendarDays } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PostComposer } from "@/components/community/post-composer";
import { PostAdminActions, ModerationActions } from "@/components/admin/moderation-controls";
import { NewPollModal, NewEventModal } from "@/components/admin/new-governance-modals";
import { PostRowActions, EventRowActions, PollRowActions } from "@/components/admin/crud";
import { POST_TYPE_LABELS } from "@/lib/constants";
import { relativeTime, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Community" };

export default async function AdminCommunity({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCommunityUser();
  const { tab } = await searchParams;
  const active = tab ?? "posts";

  const [openReports, pollCount] = await Promise.all([
    db.report.count({ where: { communityId: user.communityId!, status: "OPEN" } }),
    db.poll.count({ where: { communityId: user.communityId! } }),
  ]);

  return (
    <div>
      <PageHeader title="Community" subtitle="Announcements, feed moderation, polls and events." />
      <Tabs
        tabs={[
          { id: "posts", label: "Posts & announcements" },
          { id: "moderation", label: "Moderation", count: openReports },
          { id: "polls", label: "Polls", count: pollCount },
          { id: "events", label: "Events" },
        ]}
        className="mb-6"
      />
      {active === "posts" && <PostsTab />}
      {active === "moderation" && <ModerationTab />}
      {active === "polls" && <PollsTab />}
      {active === "events" && <EventsTab />}
    </div>
  );
}

async function PostsTab() {
  const user = await requireCommunityUser();
  const posts = await db.post.findMany({
    where: { communityId: user.communityId!, hidden: false },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <PostComposer canAnnounce />
      {posts.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {p.pinned && <Badge tone="black">Pinned</Badge>}
                <Badge tone="gray">{POST_TYPE_LABELS[p.type] ?? p.type}</Badge>
                <span className="text-2xs text-muted-foreground">{p.author.name} · {relativeTime(p.createdAt)}</span>
              </div>
              {p.title && <p className="text-sm font-semibold mt-2">{p.title}</p>}
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{p.body}</p>
              <p className="text-2xs text-muted-foreground mt-2">{p.upvoteCount} votes · {p.commentCount} comments</p>
            </div>
            <div className="flex items-center shrink-0">
              <PostRowActions post={{ id: p.id, title: p.title, body: p.body }} />
              <PostAdminActions postId={p.id} pinned={p.pinned} />
            </div>
          </div>
        </Card>
      ))}
      {posts.length === 0 && (
        <EmptyState icon={<Megaphone className="w-5 h-5" />} title="No posts yet" body="Publish the first announcement to the community feed." />
      )}
    </div>
  );
}

async function ModerationTab() {
  const user = await requireCommunityUser();
  const reports = await db.report.findMany({
    where: { communityId: user.communityId! },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const targets = await Promise.all(
    reports.map(async (r) => {
      if (r.targetType === "POST") {
        const p = await db.post.findUnique({ where: { id: r.targetId }, include: { author: { select: { name: true } } } });
        return p ? { type: "Post", preview: `${p.title ? p.title + " — " : ""}${p.body.slice(0, 120)}`, author: p.author.name } : { type: "Post", preview: "(deleted)", author: "—" };
      }
      if (r.targetType === "COMMENT") {
        const c = await db.postComment.findUnique({ where: { id: r.targetId }, include: { user: { select: { name: true } } } });
        return c ? { type: "Comment", preview: c.body.slice(0, 120), author: c.user.name } : { type: "Comment", preview: "(deleted)", author: "—" };
      }
      const i = await db.issue.findUnique({ where: { id: r.targetId } });
      return i ? { type: "Issue", preview: i.title, author: "reporter" } : { type: "Issue", preview: "(not found)", author: "—" };
    })
  );

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert className="w-5 h-5" />}
        title="Moderation queue is empty"
        body="When residents report posts, comments or issues, you review and act on them here. Every action is audit-logged."
      />
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {reports.map((r, i) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={r.status === "OPEN" ? "orange" : r.status === "ACTIONED" ? "green" : "gray"}>{r.status}</Badge>
                <span className="text-2xs text-muted-foreground">{targets[i].type} by {targets[i].author} · {relativeTime(r.createdAt)}</span>
              </div>
              <p className="text-sm mt-2 leading-relaxed">&ldquo;{targets[i].preview}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1.5">Reason: {r.reason}</p>
            </div>
          </div>
          {r.status === "OPEN" && <ModerationActions reportId={r.id} />}
        </Card>
      ))}
    </div>
  );
}

async function PollsTab() {
  const user = await requireCommunityUser();
  const polls = await db.poll.findMany({
    where: { communityId: user.communityId! },
    orderBy: { createdAt: "desc" },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end"><NewPollModal /></div>
      {polls.map((p) => {
        const total = p._count.votes;
        const closed = p.closed || p.endsAt < new Date();
        return (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                  <Vote className="w-3.5 h-3.5" /> {p.kind === "OFFICIAL" ? "Official" : "Informal"} · {total} votes · {p.anonymous ? "anonymous" : "public"}
                </div>
                <p className="text-sm font-semibold mt-1.5">{p.question}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PollRowActions pollId={p.id} question={p.question} />
                <StatusBadge status={closed ? "CLOSED" : "OPEN"} label={closed ? "Closed" : "Open"} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {p.options.sort((a, b) => a.position - b.position).map((o) => {
                const pct = total > 0 ? Math.round((o._count.votes / total) * 100) : 0;
                return (
                  <div key={o.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{o.label}</span>
                      <span className="num text-muted-foreground">{pct}% · {o._count.votes}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--muted)]">
                      <div className="h-full rounded-full bg-[#0a0a0a]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-2xs text-muted-foreground mt-3">Ends {formatDateTime(p.endsAt)}</p>
          </Card>
        );
      })}
      {polls.length === 0 && (
        <EmptyState icon={<Vote className="w-5 h-5" />} title="No polls yet" body="Create the first poll — residents vote from their portal." />
      )}
    </div>
  );
}

async function EventsTab() {
  const user = await requireCommunityUser();
  const events = await db.event.findMany({
    where: { communityId: user.communityId! },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end"><NewEventModal /></div>
      {events.map((e) => (
        <Card key={e.id} className="p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" /> <span className="capitalize">{e.type.toLowerCase()}</span>
              {e.budget > 0 && <> · budget ₹{e.budget.toLocaleString("en-IN")}</>}
            </div>
            <p className="text-sm font-semibold mt-1.5">{e.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(e.startsAt)}{e.location ? ` · ${e.location}` : ""} · {e._count.registrations} RSVPs
              {e.volunteerSlots > 0 && ` · ${e.volunteerSlots} volunteer slots`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EventRowActions event={{ id: e.id, title: e.title, location: e.location, description: e.description, date: e.startsAt.toISOString().slice(0, 10), time: e.startsAt.toISOString().slice(11, 16), cancelled: e.cancelled }} />
            <StatusBadge status={e.cancelled ? "VOIDED" : e.startsAt < new Date() ? "CLOSED" : "ACTIVE"} label={e.cancelled ? "Cancelled" : e.startsAt < new Date() ? "Past" : "Upcoming"} />
          </div>
        </Card>
      ))}
      {events.length === 0 && (
        <EmptyState icon={<CalendarDays className="w-5 h-5" />} title="No events scheduled" body="Create festivals, meetings and community events here." />
      )}
    </div>
  );
}
