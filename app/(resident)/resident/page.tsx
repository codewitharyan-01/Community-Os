import Link from "next/link";
import {
  Wallet, AlertTriangle, DoorOpen, CalendarCheck, CarFront, Megaphone, ArrowRight,
  MapPin, Clock, Users, Vote,
} from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { greeting, firstName, formatINR, formatDate, formatTime, relativeTime, periodLabel } from "@/lib/utils";
import { Card, SectionTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PayButton } from "@/components/payments/pay-button";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { askResidentAction } from "@/app/actions/ai-resident";
import { ISSUE_CATEGORY_LABELS } from "@/lib/constants";

export const metadata = { title: "Home" };

export default async function ResidentHome() {
  const user = await requireCommunityUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { unit: { include: { building: true } } },
  });
  const unitId = membership?.unitId ?? null;

  const [openInvoices, myIssues, upcomingVisitors, nextEvent, activePolls, topIssue, recentPosts] =
    await Promise.all([
      unitId
        ? db.invoice.findMany({
            where: { unitId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
            orderBy: { dueOn: "asc" },
          })
        : [],
      db.issue.findMany({
        where: { authorId: user.id, status: { notIn: ["CLOSED"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.visitor.findMany({
        where: { hostUserId: user.id, status: "EXPECTED", validTo: { gte: new Date() } },
        orderBy: { validFrom: "asc" },
        take: 2,
      }),
      db.event.findFirst({
        where: { communityId: user.communityId!, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      }),
      db.poll.findFirst({
        where: { communityId: user.communityId!, closed: false, endsAt: { gte: new Date() } },
        orderBy: { endsAt: "asc" },
        include: { _count: { select: { votes: true } } },
      }),
      db.issue.findFirst({
        where: { communityId: user.communityId!, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } },
        orderBy: { upvoteCount: "desc" },
      }),
      db.post.findMany({
        where: { communityId: user.communityId!, hidden: false },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
    ]);

  const currentDue = openInvoices.reduce((s, i) => s + i.total, 0);
  const nextInvoice = openInvoices[0];
  const hasOverdue = openInvoices.some((i) => i.status === "OVERDUE");

  const quickActions = [
    { href: "/resident/payments", label: "Pay", icon: Wallet },
    { href: "/resident/services/issues/new", label: "Report", icon: AlertTriangle },
    { href: "/resident/services/visitors", label: "Visitor", icon: DoorOpen },
    { href: "/resident/services/facilities", label: "Book", icon: CalendarCheck },
    { href: "/resident/services/parking", label: "Parking", icon: CarFront },
    { href: "/resident/community?compose=1", label: "Post", icon: Megaphone },
  ];

  return (
    <div className="space-y-1">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {greeting()}, {firstName(user.name)}.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here&rsquo;s what needs your attention today.</p>
      </div>

      {/* Maintenance due — hero card */}
      <div className="rounded-2xl bg-[#0a0a0a] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 justify-between">
          <div>
            <p className="text-xs text-white/60 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Maintenance due
              {membership && <span className="text-white/40">· {membership.unit.label}</span>}
            </p>
            {currentDue > 0 && nextInvoice ? (
              <>
                <p className="text-4xl font-semibold tracking-tight mt-2 num">{formatINR(currentDue)}</p>
                <p className={`text-xs mt-2 ${hasOverdue ? "text-[#f8b4b4]" : "text-white/60"}`}>
                  {formatINR(nextInvoice.total)} for {periodLabel(nextInvoice.period)} · due {formatDate(nextInvoice.dueOn)}
                  {hasOverdue && <span className="font-medium"> · includes overdue amount</span>}
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-semibold tracking-tight mt-2">{formatINR(0)}</p>
                <p className="text-xs text-white/60 mt-2">You&rsquo;re all settled. Thank you!</p>
              </>
            )}
          </div>
          {nextInvoice && currentDue > 0 ? (
            <PayButton
              size="lg"
              invoice={{
                id: nextInvoice.id,
                number: nextInvoice.number,
                total: nextInvoice.total,
                unitLabel: membership?.unit.label ?? "",
                periodLabel: periodLabel(nextInvoice.period),
              }}
            />
          ) : (
            <Link
              href="/resident/payments"
              className="inline-flex items-center gap-2 text-sm font-medium bg-white text-[#0a0a0a] rounded-[10px] px-4 py-2.5 hover:bg-white/90 transition-colors"
            >
              Payment history <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-card shadow-card py-4 hover:shadow-pop hover:border-[var(--border-strong)] transition-all"
          >
            <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
              <a.icon className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Attention + Community columns */}
      <div className="grid lg:grid-cols-5 gap-5 mt-7">
        {/* Needs attention */}
        <section className="lg:col-span-3">
          <SectionTitle>Needs your attention</SectionTitle>
          <div className="space-y-2.5">
            {myIssues.map((issue) => (
              <Link key={issue.id} href={`/resident/services/issues/${issue.id}`}>
                <Card className="p-4 hover:shadow-pop transition-shadow flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-lg bg-[var(--status-blue-bg)] text-[var(--status-blue)] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ISSUE_CATEGORY_LABELS[issue.category]} · updated {relativeTime(issue.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                </Card>
              </Link>
            ))}

            {upcomingVisitors.map((v) => (
              <Card key={v.id} className="p-4 flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                  <DoorOpen className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.name} is visiting</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pass {v.passCode} · {formatDate(v.validFrom)} · {v.purpose || "Guest"}
                  </p>
                </div>
                <StatusBadge status={v.status} label="Expected" />
              </Card>
            ))}

            {nextEvent && (
              <Link href="/resident/community?tab=events">
                <Card className="p-4 hover:shadow-pop transition-shadow flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{nextEvent.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatDate(nextEvent.startsAt)} · {formatTime(nextEvent.startsAt)}
                      {nextEvent.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{nextEvent.location}</span>}
                    </p>
                  </div>
                  <span className="text-xs font-medium shrink-0">RSVP →</span>
                </Card>
              </Link>
            )}

            {myIssues.length === 0 && upcomingVisitors.length === 0 && !nextEvent && (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Nothing needs your attention. Enjoy the calm. 🌿</p>
              </Card>
            )}
          </div>
        </section>

        {/* Community */}
        <section className="lg:col-span-2">
          <SectionTitle action={<Link href="/resident/community" className="text-xs font-medium text-muted-foreground hover:text-foreground">View all →</Link>}>
            Community
          </SectionTitle>
          <div className="space-y-2.5">
            {activePolls && (
              <Link href="/resident/community?tab=polls">
                <Card className="p-4 hover:shadow-pop transition-shadow">
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                    <Vote className="w-3.5 h-3.5" /> Poll open · {activePolls._count.votes} votes
                  </div>
                  <p className="text-sm font-medium mt-1.5 leading-snug">{activePolls.question}</p>
                  <span className="inline-block mt-2.5 text-xs font-medium">Vote now →</span>
                </Card>
              </Link>
            )}
            {topIssue && (
              <Link href={`/resident/services/issues/${topIssue.id}`}>
                <Card className="p-4 hover:shadow-pop transition-shadow">
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5" /> Trending issue · {topIssue.upvoteCount} votes
                  </div>
                  <p className="text-sm font-medium mt-1.5 leading-snug">{topIssue.title}</p>
                  <StatusBadge status={topIssue.status} />
                </Card>
              </Link>
            )}
            {recentPosts.map((p) => (
              <Link key={p.id} href="/resident/community">
                <Card className="p-4 hover:shadow-pop transition-shadow flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.title || p.body.slice(0, 60)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(p.createdAt)} · {p.type.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                </Card>
              </Link>
            ))}
            {!activePolls && !topIssue && recentPosts.length === 0 && (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> No community activity yet.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>

      <AIChatPanel
        mode="resident"
        raised
        suggestions={["How much do I owe?", "Is my complaint resolved?", "What's happening this weekend?", "मेरा बिल कितना है?"]}
        ask={askResidentAction}
      />
    </div>
  );
}
