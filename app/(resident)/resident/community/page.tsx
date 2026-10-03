import { Suspense } from "react";
import { MessageSquare, Vote, CalendarDays, Hash } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Tabs } from "@/components/ui/tabs";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { PollCard, EventCard } from "@/components/community/poll-event-cards";
import { MonthCalendar, type CalendarEntry } from "@/components/community/month-calendar";
import { Channels } from "@/components/community/channels";
import { EmptyState, CardSkeleton } from "@/components/ui/empty-state";
import { NewPollModal, NewEventModal } from "@/components/admin/new-governance-modals";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Community" };

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; compose?: string }>;
}) {
  const user = await requireCommunityUser();
  const { tab, compose } = await searchParams;
  const active = tab ?? "feed";
  const canModerate = can(user.role, "community.moderate");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Community</h1>
        {canModerate && active !== "channels" && (
          <div className="flex gap-2">
            {active === "polls" && <NewPollModal />}
            {active === "events" && <NewEventModal />}
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "feed", label: "Feed" },
          { id: "polls", label: "Polls" },
          { id: "events", label: "Events" },
          { id: "channels", label: "Channels" },
          { id: "calendar", label: "Calendar" },
        ]}
        className="mb-5"
      />

      {active === "feed" && <FeedTab userId={user.id} canAnnounce={canModerate} autoOpen={compose === "1"} />}
      {active === "polls" && <PollsTab userId={user.id} />}
      {active === "events" && <EventsTab userId={user.id} />}
      {active === "channels" && <ChannelsTab />}
      {active === "calendar" && <CalendarTab userId={user.id} />}
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

async function FeedTab({ userId, canAnnounce, autoOpen }: { userId: string; canAnnounce: boolean; autoOpen: boolean }) {
  const user = await requireCommunityUser();
  const posts = await db.post.findMany({
    where: { communityId: user.communityId, hidden: false },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      author: { select: { name: true, avatarHue: true } },
      comments: { where: { hidden: false }, orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, avatarHue: true } } } },
      votes: { where: { userId }, select: { id: true } },
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <PostComposer canAnnounce={canAnnounce} autoOpen={autoOpen} />
      {posts.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="w-5 h-5" />}
          title="No posts yet"
          body="Be the first to share an update, suggestion or something worth celebrating."
        />
      )}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={{
            id: p.id,
            type: p.type,
            title: p.title,
            body: p.body,
            pinned: p.pinned,
            commentsLocked: p.commentsLocked,
            upvoteCount: p.upvoteCount,
            commentCount: p.commentCount,
            createdAt: p.createdAt.toISOString(),
            authorName: p.author.name,
            authorHue: p.author.avatarHue,
            isMine: p.authorId === userId,
            hasVoted: p.votes.length > 0,
            comments: p.comments.map((c) => ({
              id: c.id,
              body: c.body,
              authorName: c.user.name,
              authorHue: c.user.avatarHue,
              createdAt: c.createdAt.toISOString(),
            })),
          }}
        />
      ))}
    </div>
  );
}

// ─── Polls ────────────────────────────────────────────────────────────────────

async function PollsTab({ userId }: { userId: string }) {
  const user = await requireCommunityUser();
  const polls = await db.poll.findMany({
    where: { communityId: user.communityId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      votes: { where: { userId }, select: { optionId: true } },
      _count: { select: { votes: true } },
    },
  });

  if (polls.length === 0) {
    return (
      <EmptyState
        icon={<Vote className="w-5 h-5" />}
        title="No polls yet"
        body="When the committee opens a vote, it will appear here. One vote per resident."
      />
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {polls.map((p) => (
        <PollCard
          key={p.id}
          poll={{
            id: p.id,
            question: p.question,
            description: p.description,
            kind: p.kind,
            closed: p.closed,
            endsAt: p.endsAt.toISOString(),
            totalVotes: p._count.votes,
            hasVoted: p.votes.length > 0,
            myOptionId: p.votes[0]?.optionId,
            options: p.options
              .sort((a, b) => a.position - b.position)
              .map((o) => ({ id: o.id, label: o.label, count: o._count.votes })),
          }}
        />
      ))}
    </div>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────

async function EventsTab({ userId }: { userId: string }) {
  const user = await requireCommunityUser();
  const events = await db.event.findMany({
    where: { communityId: user.communityId },
    orderBy: { startsAt: "asc" },
    take: 30,
    include: {
      registrations: { select: { userId: true, rsvp: true, volunteer: true } },
    },
  });
  const now = Date.now();
  const upcoming = events.filter((e) => e.startsAt.getTime() >= now);
  const past = events.filter((e) => e.startsAt.getTime() < now).reverse();

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="w-5 h-5" />}
        title="No events scheduled"
        body="Festivals, meetings and community gatherings will show up here."
      />
    );
  }

  const toDTO = (e: (typeof events)[number]) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt.toISOString(),
    budget: e.budget,
    volunteerSlots: e.volunteerSlots,
    goingCount: e.registrations.filter((r) => r.rsvp === "YES").length,
    volunteerCount: e.registrations.filter((r) => r.volunteer).length,
    myRsvp: e.registrations.find((r) => r.userId === userId)?.rsvp,
    myVolunteer: e.registrations.some((r) => r.userId === userId && r.volunteer),
    isPast: e.startsAt.getTime() < now,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      {upcoming.map((e) => <EventCard key={e.id} event={toDTO(e)} />)}
      {past.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase text-2xs pt-4">Past events</h2>
          {past.slice(0, 6).map((e) => <EventCard key={e.id} event={toDTO(e)} />)}
        </>
      )}
    </div>
  );
}

// ─── Channels ─────────────────────────────────────────────────────────────────

async function ChannelsTab() {
  const user = await requireCommunityUser();
  // Pre-selected default channel: General
  const anchor = await db.post.findFirst({
    where: { communityId: user.communityId, title: "__channel:General" },
  });
  const messages = anchor
    ? await db.postComment.findMany({
        where: { postId: anchor.id, hidden: false },
        orderBy: { createdAt: "asc" },
        take: 60,
        include: { user: { select: { name: true, avatarHue: true } } },
      })
    : [];

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {["General", "Announcements", "Tower A", "Tower B", "Tower C", "Events", "Buy & Sell", "Emergency"].map((c) => (
          <span key={c} className={`inline-flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border ${c === "General" ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : "border-[var(--border)] text-muted-foreground"}`}>
            <Hash className="w-3 h-3" /> {c}
          </span>
        ))}
      </div>
      <Channels
        channel="General"
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          authorName: m.user.name,
          authorHue: m.user.avatarHue,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

async function CalendarTab({ userId }: { userId: string }) {
  const user = await requireCommunityUser();
  const membership = await db.membership.findFirst({ where: { userId }, include: { unit: true } });
  const now = new Date();

  const [events, calendarItems, bookings, unitInvoices] = await Promise.all([
    db.event.findMany({
      where: { communityId: user.communityId, startsAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) } },
      select: { id: true, title: true, startsAt: true, type: true },
    }),
    db.calendarItem.findMany({
      where: { communityId: user.communityId, date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) } },
    }),
    membership
      ? db.booking.findMany({
          where: { unitId: membership.unitId, date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) }, status: { in: ["CONFIRMED", "PENDING"] } },
          include: { facility: true },
        })
      : [],
    membership
      ? db.invoice.findMany({
          where: { unitId: membership.unitId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
        })
      : [],
  ]);

  const entries = [
    ...events.map((e) => ({
      id: `e-${e.id}`,
      title: e.title,
      date: e.startsAt.toISOString(),
      kind: (e.type === "MEETING" ? "meeting" : e.type === "FESTIVAL" ? "festival" : "event") as CalendarEntry["kind"],
      href: "/resident/community?tab=events",
    })),
    ...calendarItems.map((c) => ({
      id: `c-${c.id}`,
      title: c.title,
      date: c.date.toISOString(),
      time: c.time,
      kind: (c.type === "FESTIVAL" ? "festival" : c.type === "PAYMENT" ? "payment" : "operations") as CalendarEntry["kind"],
    })),
    ...bookings.map((b) => ({
      id: `b-${b.id}`,
      title: `${b.facility.name} booking`,
      date: b.date.toISOString(),
      time: `${b.startHour}:00`,
      kind: "booking" as const,
      href: "/resident/services/facilities",
    })),
    ...unitInvoices.map((i) => ({
      id: `i-${i.id}`,
      title: `Maintenance due — ${formatINR(i.total)}`,
      date: i.dueOn.toISOString(),
      kind: "payment" as const,
      href: "/resident/payments",
    })),
  ];

  return (
    <div className="max-w-2xl">
      <Suspense fallback={<CardSkeleton />}>
        <MonthCalendar entries={entries} />
      </Suspense>
    </div>
  );
}
