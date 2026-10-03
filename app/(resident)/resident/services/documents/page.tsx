import { FileText, Lock } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/stat";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Documents" };

export default async function ResidentDocuments() {
  const user = await requireCommunityUser();
  const documents = await db.document.findMany({
    where: { communityId: user.communityId!, visibility: "RESIDENT" },
    orderBy: { createdAt: "desc" },
  });

  const grouped = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      <PageHeader title="Documents" subtitle="Society bye-laws, notices, policies and minutes — role-scoped access." />

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title="No documents shared yet"
            body="Documents published to residents will appear here."
          />
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase text-2xs mb-2.5">
              {DOCUMENT_CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <Card className="divide-y divide-[var(--border)]">
              {docs.map((d) => (
                <a
                  key={d.id}
                  href={`/api/files/${d.fileName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-[var(--subtle)] transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.title} <Badge tone="gray" className="ml-1.5">{d.version}</Badge></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(d.createdAt)} · {d.uploadedByName}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Open →</span>
                </a>
              ))}
            </Card>
          </div>
        ))
      )}

      <p className="text-2xs text-muted-foreground flex items-center gap-1.5 mt-4 px-1">
        <Lock className="w-3 h-3" /> Committee-only documents (contracts, audit reports) are not visible in this view.
      </p>
    </div>
  );
}
