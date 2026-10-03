import { FileText, Lock } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadDocumentModal } from "@/components/admin/admin-client";
import { DocumentRowActions } from "@/components/admin/crud";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Documents" };

export default async function AdminDocuments() {
  const user = await requireCommunityUser();
  const canManage = can(user.role, "documents.manage");

  const documents = await db.document.findMany({
    where: { communityId: user.communityId! },
    orderBy: { createdAt: "desc" },
  });

  const grouped = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Documents"
        subtitle="The society vault — registration, bye-laws, contracts, minutes and policies."
        action={canManage ? <UploadDocumentModal /> : undefined}
      />

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title="Vault is empty"
            body="Upload the society registration, bye-laws and insurance policies to get started."
            action={canManage ? <UploadDocumentModal /> : undefined}
          />
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-2xs font-semibold text-muted-foreground uppercase mb-2.5">{DOCUMENT_CATEGORY_LABELS[cat] ?? cat}</h2>
            <Card className="divide-y divide-[var(--border)]">
              {docs.map((d) => (
                <div key={d.id} className="px-5 py-3.5 flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {d.title} <Badge tone="gray" className="ml-1">{d.version}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(d.createdAt)} · {d.uploadedByName} · {(d.size / 1024).toFixed(0)}KB
                    </p>
                  </div>
                  {canManage && (
                    <DocumentRowActions doc={{ id: d.id, title: d.title, visibility: d.visibility }} />
                  )}
                  {!canManage && (
                    <StatusBadge
                      status={d.visibility === "RESIDENT" ? "ACTIVE" : "VACANT"}
                      label={d.visibility === "RESIDENT" ? "Residents" : d.visibility === "COMMITTEE" ? "Committee" : "Admins"}
                    />
                  )}
                  <a
                    href={`/api/files/${d.fileName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Open →
                  </a>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}

      <p className="text-2xs text-muted-foreground flex items-center gap-1.5 mt-4">
        <Lock className="w-3 h-3" /> Visibility is enforced server-side — residents only ever receive resident-scoped documents.
      </p>
    </div>
  );
}
