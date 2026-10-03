import { DoorOpen } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/stat";
import { InviteVisitorModal, VisitorPassActions } from "@/components/visitors/invite-visitor";
import { VISITOR_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Visitors" };

export default async function VisitorPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireCommunityUser();
  const { new: isNew } = await searchParams;

  const passes = await db.visitor.findMany({
    where: { hostUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const expected = passes.filter((p) => p.status === "EXPECTED" && p.validTo > new Date());
  const history = passes.filter((p) => !expected.includes(p));

  return (
    <div>
      <PageHeader
        title="Visitors"
        subtitle="Pre-approve guests with QR passes — the gate logs every entry and exit."
        action={<InviteVisitorModal autoOpen={isNew === "1"} />}
      />

      <SectionTitle>Expected</SectionTitle>
      {expected.length === 0 ? (
        <Card>
          <EmptyState
            icon={<DoorOpen className="w-5 h-5" />}
            title="No expected visitors"
            body="Invite a guest and they'll receive a QR pass for smooth entry."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {expected.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-4">
              <span className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center shrink-0 font-mono text-xs font-semibold">
                {p.passCode.slice(-4)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name} <span className="text-muted-foreground font-normal">· {VISITOR_TYPE_LABELS[p.type] ?? p.type}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Pass {p.passCode} · expected {formatDateTime(p.validFrom)}{p.purpose ? ` · ${p.purpose}` : ""}</p>
              </div>
              <VisitorPassActions passId={p.id} status={p.status} />
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Visit history</SectionTitle>
      {history.length === 0 ? (
        <Card>
          <EmptyState icon={<DoorOpen className="w-5 h-5" />} title="No history yet" body="Past visits, with check-in and check-out times, will appear here." />
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((p) => (
            <Card key={p.id} className="px-4 py-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(p.validFrom)}
                  {p.checkedInAt && ` · in ${formatDateTime(p.checkedInAt)}`}
                  {p.checkedOutAt && ` · out ${formatDateTime(p.checkedOutAt)}`}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
