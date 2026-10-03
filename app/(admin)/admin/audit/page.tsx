import { ScrollText } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/stat";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit logs" };

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireCommunityUser();
  if (!can(user.role, "audit.view")) {
    return (
      <div>
        <PageHeader title="Audit logs" />
        <EmptyState icon={<ScrollText className="w-5 h-5" />} title="Restricted" body="Only secretaries, treasurers and admins can view the audit trail." />
      </div>
    );
  }
  const { q } = await searchParams;
  const filter = (q ?? "").toLowerCase().trim();

  const logs = await db.auditLog.findMany({
    where: {
      communityId: user.communityId!,
      ...(filter ? { OR: [{ action: { contains: filter } }, { entity: { contains: filter } }, { actorName: { contains: filter } }, { summary: { contains: filter } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  type Row = (typeof logs)[number] & { id: string };
  const columns: Column<Row>[] = [
    { key: "when", header: "When", render: (r) => <span className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</span>, mobilePrimary: (r) => formatDateTime(r.createdAt) },
    {
      key: "actor", header: "Actor",
      render: (r) => (
        <div>
          <p className="font-medium text-[13px]">{r.actorName}</p>
          {r.actorRole && <p className="text-2xs text-muted-foreground">{r.actorRole.replace(/_/g, " ").toLowerCase()}</p>}
        </div>
      ),
      mobileSecondary: (r) => r.actorName,
    },
    { key: "action", header: "Action", render: (r) => <Badge tone="gray">{r.action.toLowerCase().replace(/_/g, " ")}</Badge> },
    { key: "summary", header: "Details", render: (r) => <span className="text-[13px]">{r.summary || `${r.entity} ${r.entityId.slice(-6)}`}</span>, mobilePrimary: (r) => r.summary || r.entity },
    {
      key: "diff", header: "Change",
      render: (r) =>
        r.before || r.after ? (
          <span className="text-2xs font-mono text-muted-foreground">
            {r.before ? shorten(r.before) : "—"} → {r.after ? shorten(r.after) : "—"}
          </span>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit logs"
        subtitle="Every sensitive action is recorded — append-only, who did what and when."
      />
      <form className="mb-4 max-w-md" action="/admin/audit">
        <input
          name="q"
          defaultValue={q}
          placeholder="Filter by action, person or summary…"
          className="w-full h-10 rounded-[10px] border border-[var(--border-strong)] px-3 text-sm focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]"
          aria-label="Filter audit logs"
        />
      </form>

      <DataTable
        columns={columns}
        rows={logs}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.summary || r.action.toLowerCase().replace(/_/g, " ")}</p>
            <p className="text-2xs text-muted-foreground">{r.actorName} · {formatDateTime(r.createdAt)}</p>
          </div>
        )}
        empty={<EmptyState icon={<ScrollText className="w-5 h-5" />} title="No audit entries" body="Sensitive actions across the platform will appear here." />}
      />
    </div>
  );
}

function shorten(json: string): string {
  try {
    const obj = JSON.parse(json);
    const entries = Object.entries(obj).slice(0, 2);
    return entries.map(([k, v]) => `${k}=${String(v).slice(0, 14)}`).join(" ");
  } catch {
    return json.slice(0, 20);
  }
}
