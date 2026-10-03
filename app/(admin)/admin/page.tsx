import Link from "next/link";
import {
  ArrowRight, Clock, FileWarning, TrendingDown, TrendingUp,
  Repeat, MapPin, Wallet, CheckCircle2, Lightbulb,
} from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { greeting, firstName, formatINR, formatINRCompact, monthKey, relativeTime } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, PageHeader, Progress } from "@/components/ui/stat";
import { generateInsights } from "@/lib/insights";
import { communityHealth, buildAttentionBrief } from "@/lib/ai";
import { CollectionAreaChart, ExpenseBarChart } from "@/components/charts/charts";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { BroadcastModal } from "@/components/admin/crud";

export const metadata = { title: "Overview" };

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  repeat: Repeat, "map-pin": MapPin, "trending-down": TrendingDown, "trending-up": TrendingUp,
  wallet: Wallet, "file-warning": FileWarning, clock: Clock, "check-circle": CheckCircle2,
};

export default async function AdminOverview() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    community,
    invoices,
    paymentsThisMonth,
    paymentsYtd,
    expenses,
    openIssues,
    slaBreaches,
    expiringContracts,
    insights,
    health,
    recentAudit,
    monthlyPayments,
  ] = await Promise.all([
    db.community.findUnique({ where: { id: communityId } }),
    db.invoice.findMany({ where: { communityId, status: { not: "VOIDED" } } }),
    db.payment.aggregate({ where: { communityId, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.payment.findMany({ where: { communityId, createdAt: { gte: new Date(now.getFullYear(), 0, 1) } }, select: { amount: true, createdAt: true } }),
    db.expense.findMany({ where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
    db.issue.count({ where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } } }),
    db.issue.count({ where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] }, severity: { notIn: ["LOW"] }, createdAt: { lt: new Date(now.getTime() - 7 * 86400000) } } }),
    db.vendor.count({ where: { communityId, contractEnd: { lte: new Date(now.getTime() + 30 * 86400000), gte: now } } }),
    generateInsights(communityId),
    communityHealth(communityId),
    db.auditLog.findMany({ where: { communityId }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.payment.findMany({ where: { communityId }, select: { amount: true, createdAt: true } }),
  ]);

  // Finance figures (calendar YTD, matching invoices issued this year)
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ytdInvoices = invoices.filter((i) => i.issuedOn >= yearStart);
  const billedYtd = ytdInvoices.reduce((s, i) => s + i.total, 0);
  const collectedYtd = paymentsYtd.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, billedYtd - collectedYtd);
  const collectionRate = billedYtd > 0 ? (collectedYtd / billedYtd) * 100 : 100;
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // 6-month collection trend from payments
  const trendMap = new Map<string, { collected: number; billed: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendMap.set(monthKey(d), { collected: 0, billed: 0 });
  }
  monthlyPayments.forEach((p) => {
    const key = monthKey(p.createdAt);
    const row = trendMap.get(key);
    if (row) row.collected += p.amount;
  });
  const ytdByPeriod = new Map<string, number>();
  ytdInvoices.forEach((i) => ytdByPeriod.set(i.period, (ytdByPeriod.get(i.period) ?? 0) + i.total));
  for (const [key, row] of trendMap) {
    row.billed = ytdByPeriod.get(key) ?? 0;
  }
  const trend = [...trendMap.entries()].map(([key, v]) => ({
    month: new Date(Number(key.split("-")[0]), Number(key.split("-")[1]) - 1, 1).toLocaleDateString("en-IN", { month: "short" }),
    ...v,
  }));

  const expenseByCat = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      const key = e.category.charAt(0) + e.category.slice(1).toLowerCase();
      acc[key] = (acc[key] ?? 0) + e.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

  const attention = await buildAttentionBrief(communityId);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(user.name)}.`}
        subtitle="Here's what needs your attention."
        action={
          <div className="flex flex-wrap gap-2">
            <BroadcastModal />
            <Link href="/admin/ai" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#262626] transition-colors">
              Community intelligence <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Collected (YTD)" value={formatINRCompact(collectedYtd)} sub={`${formatINRCompact(paymentsThisMonth._sum.amount ?? 0)} this month`} />
        <StatCard label="Outstanding" value={formatINRCompact(outstanding)} tone={outstanding > 0 ? "orange" : "green"} sub={`${ytdInvoices.length} invoices YTD`} />
        <StatCard label="Collection rate" value={`${collectionRate.toFixed(1)}%`} tone={collectionRate >= 85 ? "green" : "orange"} />
        <StatCard label="Open issues" value={openIssues} href="/admin/issues" sub="across all categories" />
        <StatCard label="SLA breaches" value={slaBreaches} tone={slaBreaches > 0 ? "red" : "green"} href="/admin/issues" sub="7+ days unresolved" />
        <StatCard label="Expiring contracts" value={expiringContracts} tone={expiringContracts > 0 ? "orange" : "green"} href="/admin/vendors" sub="within 30 days" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today brief */}
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <span className="text-2xs text-muted-foreground">{community?.name}</span>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm leading-relaxed whitespace-pre-line">{attention}</p>
            </CardBody>
          </Card>

          {/* Collection trend */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Collection trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Billed vs collected · last 6 months</p>
              </div>
              <Link href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground">Finance →</Link>
            </CardHeader>
            <CardBody className="pt-0">
              <CollectionAreaChart data={trend} />
            </CardBody>
          </Card>

          {/* Expense breakdown */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>This month&rsquo;s expenses</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{formatINR(expenseTotal)} approved so far</p>
              </div>
              <Link href="/admin/finance?tab=expenses" className="text-xs text-muted-foreground hover:text-foreground">Expenses →</Link>
            </CardHeader>
            <CardBody className="pt-0">
              {expenseByCat.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded yet this month.</p>
              ) : (
                <ExpenseBarChart data={expenseByCat} />
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-5">
          {/* Health score */}
          <Card>
            <CardHeader>
              <CardTitle>Community health</CardTitle>
              <span className="text-2xl font-semibold num">{health.overall}</span>
            </CardHeader>
            <CardBody className="space-y-3.5">
              {([
                ["Financial", health.financial],
                ["Operational", health.operational],
                ["Maintenance", health.maintenance],
                ["Engagement", health.engagement],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium num">{value}</span>
                  </div>
                  <Progress value={value} tone={value >= 75 ? "green" : value >= 50 ? "black" : "orange"} />
                </div>
              ))}
              <p className="text-2xs text-muted-foreground pt-1 flex gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                Decision-support score for the committee — not visible to residents.
              </p>
            </CardBody>
          </Card>

          {/* AI insights */}
          <Card>
            <CardHeader>
              <CardTitle>AI insights</CardTitle>
              <Link href="/admin/ai" className="text-xs text-muted-foreground hover:text-foreground">All →</Link>
            </CardHeader>
            <CardBody className="pt-0 space-y-3">
              {insights.map((ins, i) => {
                const Icon = INSIGHT_ICONS[ins.icon] ?? Lightbulb;
                const inner = (
                  <div className="flex gap-2.5">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ins.tone === "warn" ? "bg-[var(--status-orange-bg)] text-[var(--status-orange)]" : ins.tone === "good" ? "bg-[var(--status-green-bg)] text-[var(--status-green)]" : "bg-[var(--status-blue-bg)] text-[var(--status-blue)]"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-[13px] leading-relaxed">{ins.text}</p>
                  </div>
                );
                return ins.href ? (
                  <Link key={i} href={ins.href} className="block rounded-lg hover:bg-[var(--subtle)] transition-colors -mx-2 px-2 py-1">{inner}</Link>
                ) : (
                  <div key={i}>{inner}</div>
                );
              })}
              {insights.length === 0 && <p className="text-sm text-muted-foreground">No notable patterns right now.</p>}
            </CardBody>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <Link href="/admin/audit" className="text-xs text-muted-foreground hover:text-foreground">Audit log →</Link>
            </CardHeader>
            <CardBody className="pt-0 space-y-2.5">
              {recentAudit.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--border-strong)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">{a.summary || `${a.action.toLowerCase().replace(/_/g, " ")}`}</p>
                    <p className="text-2xs text-muted-foreground">{a.actorName} · {relativeTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
              {recentAudit.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      <AIChatPanel
        mode="admin"
        suggestions={["What needs my attention today?", "Show overdue residents", "Summarize this month's expenses", "Which vendor contracts expire soon?"]}
        ask={askAdminQuery}
        title="Community Intelligence"
        subtitle="Admin copilot — grounded in live data"
      />
    </div>
  );
}

async function askAdminQuery(q: string) {
  "use server";
  const { requireCommunityUser } = await import("@/lib/auth");
  const { askAdminAI } = await import("@/lib/ai");
  const user = await requireCommunityUser();
  return askAdminAI(user.communityId!, q);
}
