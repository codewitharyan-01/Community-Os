import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/stat";
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Issues" };

export default async function ResidentIssues() {
  const user = await requireCommunityUser();
  const [mine, communityIssues] = await Promise.all([
    db.issue.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
    db.issue.findMany({
      where: {
        communityId: user.communityId!,
        status: { notIn: ["CLOSED"] },
        authorId: { not: user.id },
      },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { author: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Issues & complaints"
        subtitle="Track what you reported and what your neighbours are voting on."
        action={
          <Link href="/resident/services/issues/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#262626] transition-colors">
            <AlertTriangle className="w-4 h-4" /> Report issue
          </Link>
        }
      />

      <SectionTitle>My reports</SectionTitle>
      {mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle className="w-5 h-5" />}
            title="No complaints yet"
            body="When you report an issue, you'll be able to track its full lifecycle here."
            action={
              <Link href="/resident/services/issues/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium">
                Report your first issue
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {mine.map((i) => (
            <Link key={i.id} href={`/resident/services/issues/${i.id}`}>
              <Card className="px-4 py-3.5 flex items-center gap-3.5 hover:shadow-pop transition-shadow">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ISSUE_CATEGORY_LABELS[i.category] ?? i.category} · {ISSUE_STATUS_LABELS[i.status] ?? i.status} · {relativeTime(i.createdAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <SectionTitle>Trending in your community</SectionTitle>
      {communityIssues.length === 0 ? (
        <Card>
          <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="No open community issues" body="Everything reported so far has been resolved." />
        </Card>
      ) : (
        <div className="space-y-2">
          {communityIssues.map((i) => (
            <Link key={i.id} href={`/resident/services/issues/${i.id}`}>
              <Card className="px-4 py-3.5 flex items-center gap-3.5 hover:shadow-pop transition-shadow">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {i.upvoteCount} votes · {i.commentCount} comments · {ISSUE_CATEGORY_LABELS[i.category] ?? i.category}
                  </p>
                </div>
                <StatusBadge status={i.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
