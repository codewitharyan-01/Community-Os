import { DoorOpen, CarFront, Siren, AlertTriangle } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ResolveEmergencyButton, ResolveIncidentButton } from "@/components/admin/moderation-controls";
import { EmergencyModal, IncidentModal } from "@/components/security/security-modals";
import { VISITOR_TYPE_LABELS, EMERGENCY_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime, formatDate } from "@/lib/utils";

export const metadata = { title: "Security" };

export default async function AdminSecurity({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const { tab } = await searchParams;
  const active = tab ?? "visitors";

  const todayStart = new Date(new Date().toDateString());

  const [todayVisitors, activeAlert, incidentCount] = await Promise.all([
    db.visitor.count({ where: { communityId, createdAt: { gte: todayStart } } }),
    db.emergencyAlert.findFirst({ where: { communityId, active: true } }),
    db.securityIncident.count({ where: { communityId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Visitor operations, vehicle registry, incidents and emergency broadcasts."
        action={
          <div className="flex gap-2">
            {can(user.role, "security.incident") && <IncidentModal />}
            {can(user.role, "security.emergency") && <EmergencyModal />}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Visitors today" value={todayVisitors} />
        <StatCard label="Open incidents" value={incidentCount} tone={incidentCount > 0 ? "red" : "green"} />
        <StatCard label="Emergency status" value={activeAlert ? "ACTIVE" : "Clear"} tone={activeAlert ? "red" : "green"} />
        <StatCard label="Gate desk" value="24×7" sub="security portal live" />
      </div>

      {activeAlert && (
        <Card className="p-4 mb-6 border-[var(--status-red)] bg-[var(--status-red-bg)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-[var(--status-red)] flex items-center gap-2">
                <Siren className="w-4 h-4" /> {EMERGENCY_TYPE_LABELS[activeAlert.type] ?? activeAlert.type} emergency active
              </p>
              <p className="text-sm mt-1">{activeAlert.message}</p>
              <p className="text-2xs text-muted-foreground mt-1">Raised by {activeAlert.createdByName} · {formatDateTime(activeAlert.createdAt)}</p>
            </div>
            {can(user.role, "security.emergency") && <ResolveEmergencyButton alertId={activeAlert.id} />}
          </div>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: "visitors", label: "Visitor log" },
          { id: "vehicles", label: "Vehicles" },
          { id: "incidents", label: "Incidents" },
        ]}
        className="mb-6"
      />
      {active === "visitors" && <VisitorsLog communityId={communityId} />}
      {active === "vehicles" && <VehicleRegistry communityId={communityId} />}
      {active === "incidents" && <IncidentsTab communityId={communityId} />}
    </div>
  );
}

async function VisitorsLog({ communityId }: { communityId: string }) {
  const visitors = await db.visitor.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { host: { select: { name: true } } },
  });

  type Row = (typeof visitors)[number] & { id: string };
  const columns: Column<Row>[] = [
    { key: "name", header: "Visitor", render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{VISITOR_TYPE_LABELS[r.type] ?? r.type}{r.purpose ? ` · ${r.purpose}` : ""}</p></div>, mobilePrimary: (r) => <span className="font-medium">{r.name}</span> },
    { key: "host", header: "Host", render: (r) => <span className="text-xs">{r.host?.name ?? "—"}</span>, mobileSecondary: (r) => r.host?.name ?? "—" },
    { key: "code", header: "Pass", render: (r) => <span className="font-mono text-xs">{r.passCode}</span> },
    { key: "when", header: "Window", render: (r) => <span className="text-xs">{formatDate(r.validFrom)}</span> },
    { key: "in", header: "In / Out", render: (r) => <span className="text-xs">{r.checkedInAt ? formatDateTime(r.checkedInAt) : "—"}{r.checkedOutAt ? ` → ${formatDateTime(r.checkedOutAt)}` : ""}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={visitors}
      mobileTitle={(r) => (
        <div>
          <p className="text-sm font-medium">{r.name}</p>
          <p className="text-2xs text-muted-foreground">{r.host?.name ?? "—"} · {formatDate(r.validFrom)}</p>
        </div>
      )}
      empty={<EmptyState icon={<DoorOpen className="w-5 h-5" />} title="No visitor records" body="Resident invites and gate walk-ins appear here." />}
    />
  );
}

async function VehicleRegistry({ communityId }: { communityId: string }) {
  const vehicles = await db.vehicle.findMany({
    where: { communityId },
    orderBy: { number: "asc" },
    take: 200,
    include: { unit: true },
  });

  type Row = (typeof vehicles)[number] & { id: string };
  const columns: Column<Row>[] = [
    { key: "number", header: "Vehicle", render: (r) => <span className="font-mono text-xs font-medium">{r.number}</span>, mobilePrimary: (r) => <span className="font-mono text-xs font-medium">{r.number}</span> },
    { key: "type", header: "Type", render: (r) => <span className="text-xs capitalize">{r.type.toLowerCase()}</span> },
    { key: "model", header: "Model", render: (r) => <span className="text-xs">{r.model || "—"}</span> },
    { key: "unit", header: "Unit", render: (r) => <span className="text-xs">{r.unit?.label ?? "—"}</span>, mobileSecondary: (r) => r.unit?.label ?? "—" },
  ];

  return (
    <DataTable
      columns={columns}
      rows={vehicles}
      mobileTitle={(r) => <p className="text-sm font-mono font-medium">{r.number}</p>}
      empty={<EmptyState icon={<CarFront className="w-5 h-5" />} title="No vehicles registered" />}
    />
  );
}

async function IncidentsTab({ communityId }: { communityId: string }) {
  const incidents = await db.securityIncident.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (incidents.length === 0) {
    return <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="No incidents logged" body="Security incidents reported from the gate desk or admin appear here." />;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {incidents.map((i) => (
        <Card key={i.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={i.status} />
                <StatusBadge status={i.severity === "CRITICAL" ? "CRITICAL" : "OPEN"} label={i.severity} />
                <span className="text-2xs text-muted-foreground">{i.type} · {i.location || "—"}</span>
              </div>
              <p className="text-sm font-semibold mt-2">{i.title}</p>
              {i.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{i.description}</p>}
              <p className="text-2xs text-muted-foreground mt-2">Reported by {i.reportedByName} · {formatDateTime(i.createdAt)}</p>
            </div>
            {i.status !== "RESOLVED" && <ResolveIncidentButton incidentId={i.id} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
