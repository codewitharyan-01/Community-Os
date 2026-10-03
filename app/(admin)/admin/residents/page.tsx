import { Users, MessageSquare, CarFront } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/stat";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { AddResidentModal } from "@/components/admin/admin-client";
import { ResidentRowActions, AddBuildingModal } from "@/components/admin/crud";
import { formatINR } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Residents" };

export default async function AdminResidents() {
  const user = await requireCommunityUser();
  const canManage = can(user.role, "residents.manage");

  const [memberships, units, invoices] = await Promise.all([
    db.membership.findMany({
      where: { unit: { communityId: user.communityId! } },
      include: {
        user: true,
        unit: { include: { building: true } },
      },
      orderBy: { unitId: "asc" },
    }),
    db.unit.findMany({
      where: { communityId: user.communityId!, status: "VACANT" },
      include: { building: true },
      orderBy: { label: "asc" },
      take: 200,
    }),
    db.invoice.findMany({
      where: { communityId: user.communityId!, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      select: { unitId: true, total: true },
    }),
  ]);

  const outstandingByUnit = new Map<string, number>();
  invoices.forEach((i) => outstandingByUnit.set(i.unitId, (outstandingByUnit.get(i.unitId) ?? 0) + i.total));

  type Row = {
    id: string;
    name: string;
    email: string;
    phone: string;
    unit: string;
    building: string;
    role: string;
    type: string;
    active: boolean;
    outstanding: number;
    vehicles: number;
  };

  const rows: Row[] = memberships.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    phone: m.user.phone || "—",
    unit: m.unit.label,
    building: m.unit.building.name,
    role: m.user.role,
    type: m.type,
    active: m.user.active,
    outstanding: outstandingByUnit.get(m.unitId) ?? 0,
    vehicles: 0,
  }));

  const vehicleCounts = await db.vehicle.groupBy({
    by: ["unitId"],
    where: { communityId: user.communityId!, unitId: { not: null } },
    _count: true,
  });
  const vehByUnit = new Map(vehicleCounts.map((v) => [v.unitId, v._count]));
  rows.forEach((r) => {
    const m = memberships.find((mm) => mm.id === r.id);
    r.vehicles = m ? vehByUnit.get(m.unitId) ?? 0 : 0;
  });

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Resident",
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0">
            <p className="font-medium truncate">{r.name}</p>
            <p className="text-xs text-muted-foreground truncate">{r.email}</p>
          </div>
        </div>
      ),
      mobilePrimary: (r) => <span className="font-medium">{r.name}</span>,
      mobileSecondary: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    { key: "unit", header: "Flat", render: (r) => <span className="font-mono text-xs">{r.unit} · {r.building}</span>, mobilePrimary: (r) => r.unit },
    { key: "role", header: "Role", render: (r) => <span className="text-xs">{ROLE_LABELS[r.role] ?? r.role} · {r.type.toLowerCase()}</span>, mobileSecondary: (r) => r.type.toLowerCase() },
    { key: "phone", header: "Phone", render: (r) => <span className="text-xs">{r.phone}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.active ? "ACTIVE" : "VACANT"} label={r.active ? "Active" : "Inactive"} />, mobileRight: (r) => <StatusBadge status={r.active ? "ACTIVE" : "VACANT"} label={r.active ? "Active" : "Inactive"} /> },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (r) =>
        r.outstanding > 0 ? (
          <span className="font-medium text-[var(--status-orange)] num">{formatINR(r.outstanding)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      mobilePrimary: (r) => (r.outstanding > 0 ? formatINR(r.outstanding) : "—"),
    },
    { key: "vehicles", header: "Vehicles", render: (r) => <span className="text-xs">{r.vehicles}</span> },
    ...(canManage
      ? [{
          key: "rowActions",
          header: "",
          render: (r: Row) => (
            <ResidentRowActions
              user={{ id: r.id, name: r.name, phone: r.phone === "—" ? "" : r.phone, membershipType: r.type, active: r.active }}
            />
          ),
          mobileRight: (r: Row) => (
            <ResidentRowActions
              user={{ id: r.id, name: r.name, phone: r.phone === "—" ? "" : r.phone, membershipType: r.type, active: r.active }}
            />
          ),
        }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Residents"
        subtitle={`${rows.length} residents across the community.`}
        action={canManage ? (
          <div className="flex gap-2">
            <AddBuildingModal />
            <AddResidentModal units={units.map((u) => ({ id: u.id, label: u.label, building: u.building.name }))} />
          </div>
        ) : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        mobileTitle={(r) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={r.name} size="sm" />
            <div>
              <p className="text-sm font-medium leading-tight">{r.name}</p>
              <p className="text-2xs text-muted-foreground">{r.unit} · {r.building}</p>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="No residents yet"
            body="Add your first resident to get started — or run the community onboarding."
          />
        }
      />

      <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
        <MiniStat icon={Users} label="Households linked" value={String(new Set(rows.map((r) => r.unit)).size)} />
        <MiniStat icon={MessageSquare} label="Active accounts" value={String(rows.filter((r) => r.active).length)} />
        <MiniStat icon={CarFront} label="Vehicles" value={String(rows.reduce((s, r) => s + r.vehicles, 0))} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <p className="text-lg font-semibold num mt-1.5">{value}</p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}
