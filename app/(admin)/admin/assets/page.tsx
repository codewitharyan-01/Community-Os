import { Boxes, Wrench } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { GenerateServiceTaskButton, RunPMCheckButton } from "@/components/assets/asset-controls";
import { AssetModal, MarkServicedButton } from "@/components/admin/crud";
import { ASSET_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/utils";

export const metadata = { title: "Assets" };

export default async function AdminAssets() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;

  const assets = await db.asset.findMany({
    where: { communityId },
    orderBy: { name: "asc" },
    include: { tasks: { where: { status: { notIn: ["COMPLETED", "VERIFIED"] } }, select: { id: true } } },
  });

  const dueSoon = assets.filter((a) => a.nextServiceAt && a.nextServiceAt <= new Date(Date.now() + 7 * 86400000));
  const poorCondition = assets.filter((a) => a.condition === "POOR" || a.condition === "FAIR");

  type Row = (typeof assets)[number] & { id: string };
  const columns: Column<Row>[] = [
    {
      key: "name", header: "Asset",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{r.assetCode} · {r.location || "—"}</p>
        </div>
      ),
      mobilePrimary: (r) => <span className="font-medium">{r.name}</span>,
      mobileSecondary: (r) => <span className="font-mono text-2xs">{r.assetCode}</span>,
    },
    { key: "category", header: "Category", render: (r) => <span className="text-xs">{ASSET_CATEGORY_LABELS[r.category] ?? humanize(r.category)}</span> },
    { key: "condition", header: "Condition", render: (r) => <StatusBadge status={r.condition === "POOR" ? "OVERDUE" : r.condition === "FAIR" ? "PENDING" : "ACTIVE"} label={humanize(r.condition)} />, mobileRight: (r) => <StatusBadge status={r.condition === "POOR" ? "OVERDUE" : "ACTIVE"} label={humanize(r.condition)} /> },
    { key: "last", header: "Last service", render: (r) => <span className="text-xs">{r.lastServiceAt ? formatDate(r.lastServiceAt) : "—"}</span> },
    {
      key: "next", header: "Next service",
      render: (r) => {
        if (!r.nextServiceAt) return <span className="text-xs text-muted-foreground">No schedule</span>;
        const overdue = r.nextServiceAt < new Date();
        return <span className={`text-xs ${overdue ? "text-[var(--status-red)] font-medium" : ""}`}>{formatDate(r.nextServiceAt)}{overdue ? " · due" : ""}</span>;
      },
    },
    {
      key: "actions", header: "",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.tasks.length === 0 && <GenerateServiceTaskButton assetId={r.id} assetName={r.name} />}
          <MarkServicedButton assetId={r.id} assetName={r.name} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle="Society equipment with service history and preventive schedules."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AssetModal />
            <RunPMCheckButton />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total assets" value={assets.length} />
        <StatCard label="Service due (7d)" value={dueSoon.length} tone={dueSoon.length > 0 ? "orange" : "green"} />
        <StatCard label="Needs attention" value={poorCondition.length} tone={poorCondition.length > 0 ? "orange" : "green"} sub="fair or poor condition" />
        <StatCard label="On schedule" value={assets.length - dueSoon.length} tone="green" />
      </div>

      <DataTable
        columns={columns}
        rows={assets}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.name}</p>
            <p className="text-2xs text-muted-foreground">{r.location || r.assetCode}</p>
          </div>
        )}
        empty={
          <EmptyState
            icon={<Boxes className="w-5 h-5" />}
            title="No assets registered"
            body="Add lifts, pumps, generators and other equipment to track their service lifecycle."
          />
        }
      />

      <p className="text-2xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <Wrench className="w-3 h-3" /> Preventive maintenance automatically generates tasks when the next service date approaches.
      </p>
    </div>
  );
}
