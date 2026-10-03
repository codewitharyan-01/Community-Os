import { BarChart3, Download } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/reports/print-button";
import { CollectionAreaChart, BuildingCollectionChart, EngagementLineChart, ExpenseBarChart } from "@/components/charts/charts";
import { formatINR, monthKey } from "@/lib/utils";

export const metadata = { title: "Reports" };

const REPORTS = [
  { type: "financial", title: "Financial report", desc: "Full income & expense ledger with net position." },
  { type: "collection", title: "Collection report", desc: "Every invoice YTD with payment status." },
  { type: "outstanding", title: "Outstanding report", desc: "All unpaid and overdue invoices." },
  { type: "expenses", title: "Expense report", desc: "Approved & paid expenses by category." },
  { type: "issues", title: "Issue report", desc: "Complaint volumes, resolution and SLA data." },
  { type: "vendors", title: "Vendor report", desc: "Contracts, commitments and renewal dates." },
  { type: "visitors", title: "Visitor report", desc: "Gate entries with check-in/out timestamps." },
];

export default async function AdminReports() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const now = new Date();

  const [payments, invoices, expenses, events, regs, issues, units] = await Promise.all([
    db.payment.findMany({ where: { communityId }, select: { amount: true, createdAt: true } }),
    db.invoice.findMany({ where: { communityId, status: { not: "VOIDED" } }, include: { unit: { include: { building: true } } } }),
    db.expense.findMany({ where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
    db.event.findMany({ where: { communityId, startsAt: { gte: new Date(now.getFullYear(), 0, 1) } }, select: { id: true } }),
    db.eventRegistration.findMany({ where: { event: { communityId }, rsvp: "YES" }, select: { id: true } }),
    db.issue.findMany({ where: { communityId }, select: { status: true, createdAt: true, resolvedAt: true } }),
    db.unit.findMany({ where: { communityId }, include: { building: true, invoices: { where: { status: { not: "VOIDED" } } } } }),
  ]);

  // Monthly collections (12 mo)
  const months: { month: string; collected: number; billed: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.toLocaleDateString("en-IN", { month: "short" }), collected: 0, billed: 0 });
  }
  const monthKeys = months.map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
    return monthKey(d);
  });
  payments.forEach((p) => {
    const idx = monthKeys.indexOf(monthKey(p.createdAt));
    if (idx >= 0) months[idx].collected += p.amount;
  });
  invoices.forEach((i) => {
    const idx = monthKeys.indexOf(monthKey(i.issuedOn));
    if (idx >= 0) months[idx].billed += i.total;
  });

  // Building-wise
  const bMap = new Map<string, { collected: number; outstanding: number }>();
  units.forEach((u) => {
    const key = u.building.name;
    const row = bMap.get(key) ?? { collected: 0, outstanding: 0 };
    u.invoices.forEach((i) => {
      if (i.status === "PAID") row.collected += i.total;
      else row.outstanding += i.total;
    });
    bMap.set(key, row);
  });
  const buildingData = [...bMap.entries()].map(([building, v]) => ({ building, ...v }));

  // Engagement (RSVP per event per 100 residents)
  const residents = await db.user.count({ where: { communityId, role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] }, active: true } });
  const engagement = months.slice(-6).map((m, i) => ({
    month: m.month,
    participation: events.length > 0 && residents > 0 ? Math.min(100, Math.round(((regs.length / events.length) / residents) * 100 * 10) + i * 0) : 0,
  }));

  // Resolution stats
  const resolved = issues.filter((i) => i.resolvedAt);
  const avgResolutionHrs =
    resolved.length > 0
      ? Math.round(resolved.reduce((s, i) => s + (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 3600000, 0) / resolved.length)
      : 0;

  const expenseByCat = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      const key = e.category.charAt(0) + e.category.slice(1).toLowerCase();
      acc[key] = (acc[key] ?? 0) + e.amount;
      return acc;
    }, {})
  ).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="One-click exports and print-ready layouts — numbers come straight from the database."
        action={<PrintButton />}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8 no-print">
        {REPORTS.map((r) => (
          <Card key={r.type} className="p-4">
            <p className="text-sm font-semibold">{r.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
            <a
              href={`/api/reports/${r.type}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium hover:underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </a>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Collection trend · 12 months</CardTitle></CardHeader>
          <CardBody className="pt-0"><CollectionAreaChart data={months} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Building-wise collection</CardTitle></CardHeader>
          <CardBody className="pt-0"><BuildingCollectionChart data={buildingData} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expense breakdown · this month</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {expenseByCat.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">No expenses this month.</p> : <ExpenseBarChart data={expenseByCat} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Community engagement</CardTitle></CardHeader>
          <CardBody className="pt-0"><EngagementLineChart data={engagement} /></CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Operations summary</CardTitle>
        </CardHeader>
        <CardBody className="pt-0 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Sum label="Issues logged" value={String(issues.length)} />
          <Sum label="Issues resolved" value={String(resolved.length)} />
          <Sum label="Avg resolution time" value={avgResolutionHrs > 0 ? `${avgResolutionHrs}h` : "—"} />
          <Sum label="Total collected" value={formatINR(payments.reduce((s, p) => s + p.amount, 0))} />
        </CardBody>
      </Card>
    </div>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="font-semibold num mt-0.5">{value}</p>
    </div>
  );
}
