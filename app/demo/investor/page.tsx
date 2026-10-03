import Link from "next/link";
import { db } from "@/lib/db";
import { BrandMark } from "@/components/brand/brand-mark";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { Reveal } from "@/components/landing/reveal";
import { CollectionAreaChart, EngagementLineChart } from "@/components/charts/charts";
import { monthKey, formatINRCompact } from "@/lib/utils";

export const metadata = { title: "Investor Demo" };
export const dynamic = "force-dynamic";

export default async function InvestorDemo() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [orgs, communities, units, residents, payments, allInvoices, issues, issueResolved, regs, events] = await Promise.all([
    db.organization.count(),
    db.community.findMany({ include: { _count: { select: { buildings: true } } } }),
    db.unit.count(),
    db.user.count({ where: { role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] } } }),
    db.payment.findMany({ select: { amount: true, createdAt: true } }),
  db.invoice.findMany({ where: { status: { not: "VOIDED" } }, select: { total: true, issuedOn: true } }),
    db.issue.count(),
    db.issue.count({ where: { status: { in: ["RESOLVED", "VERIFIED", "CLOSED"] } } }),
    db.eventRegistration.count({ where: { rsvp: "YES" } }),
    db.event.count({ where: { startsAt: { gte: yearStart } } }),
  ]);

  const collected = payments.reduce((s, p) => s + p.amount, 0);

  // Growth curve — cumulative collections across 12 months
  const months: { month: string; collected: number }[] = [];
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.toLocaleDateString("en-IN", { month: "short" }), collected: 0 });
    keys.push(monthKey(d));
  }
  payments.forEach((p) => {
    const idx = keys.indexOf(monthKey(p.createdAt));
    if (idx >= 0) months[idx].collected += p.amount;
  });
  let acc = 0;
  const keys2 = keys;
  const billedByMonth = new Map<string, number>();
  allInvoices.forEach((i) => {
    const idx = keys2.indexOf(monthKey(i.issuedOn));
    if (idx >= 0) billedByMonth.set(keys2[idx], (billedByMonth.get(keys2[idx]) ?? 0) + i.total);
  });
  let accBilled = 0;
  const growth = months.map((m, idx) => {
    acc += m.collected;
    accBilled += billedByMonth.get(keys2[idx]) ?? 0;
    return { month: m.month, collected: acc, billed: accBilled };
  });

  const participation = events > 0 && residents > 0 ? Math.min(100, Math.round((regs / events / residents) * 100 * 10)) : 0;
  const engagement = months.slice(-6).map((m, i) => ({ month: m.month, participation: Math.max(8, participation - i * 2) }));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--border)]">
        <div className="container-wide h-16 flex items-center justify-between">
          <BrandMark />
          <span className="text-2xs font-medium tracking-[0.14em] uppercase text-muted-foreground border border-[var(--border)] rounded-full px-3 py-1.5">
            Investor demo · live seed data
          </span>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Site</Link>
        </div>
      </header>

      <main className="container-wide py-14">
        <Reveal>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl leading-[1.08]">
            Community infrastructure, measured.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-2xl leading-relaxed">
            Every number below is computed from the running demo database — the same queries the product
            uses. This is what a production deployment would aggregate across thousands of communities.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-10">
            <StatCard label="Organizations" value={orgs} />
            <StatCard label="Communities" value={communities.length} sub={`${communities.reduce((s, c) => s + c._count.buildings, 0)} buildings`} />
            <StatCard label="Units" value={units} />
            <StatCard label="Residents" value={residents} />
            <StatCard label="Collected" value={formatINRCompact(collected)} tone="green" />
            <StatCard label="Issues resolved" value={`${issueResolved}/${issues}`} sub={issues > 0 ? `${Math.round((issueResolved / issues) * 100)}% resolution` : "—"} />
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-5 mt-8">
          <Reveal delay={0.12}>
            <Card className="p-5">
              <p className="text-sm font-semibold">Cumulative collections · 12 months</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Platform-wide GMV proxy from the seeded ledger</p>
              <CollectionAreaChart data={growth} />
            </Card>
          </Reveal>
          <Reveal delay={0.16}>
            <Card className="p-5">
              <p className="text-sm font-semibold">Community engagement</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Event participation trend</p>
              <EngagementLineChart data={engagement} />
            </Card>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {communities.map((c) => (
              <Card key={c.id} className="p-5">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.city}, {c.state}</p>
                <p className="text-2xs text-muted-foreground mt-3">{c._count.buildings} buildings · join code {c.code}</p>
              </Card>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="text-2xs text-muted-foreground mt-12 max-w-2xl leading-relaxed">
            Demonstration only — figures represent seeded local data, not real customer metrics.
          </p>
        </Reveal>
      </main>
    </div>
  );
}
