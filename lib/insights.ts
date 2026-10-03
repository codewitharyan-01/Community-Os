// AI Insights — computed from live seed data, deterministic, explainable.
// These are suggestions, never autonomous decisions.

import { db } from "@/lib/db";
import { formatINR, monthKey } from "@/lib/utils";

export type Insight = {
  tone: "warn" | "info" | "good";
  icon: string;
  text: string;
  href?: string;
};

export async function generateInsights(communityId: string): Promise<Insight[]> {
  const out: Insight[] = [];
  const now = new Date();

  const issues = await db.issue.findMany({
    where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } },
    select: { category: true, location: true, title: true, createdAt: true, severity: true, upvoteCount: true },
  });

  // 1. Recurring category / location detection
  const catCount = new Map<string, number>();
  issues.forEach((i) => catCount.set(i.category, (catCount.get(i.category) ?? 0) + 1));
  const topCat = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] >= 3) {
    out.push({
      tone: "warn", icon: "repeat",
      text: `${topCat[1]} open ${topCat[0].toLowerCase()} issues — a recurring pattern worth a permanent fix.`,
      href: "/admin/issues",
    });
  }
  const locCount = new Map<string, number>();
  issues.forEach((i) => { if (i.location) locCount.set(i.location, (locCount.get(i.location) ?? 0) + 1); });
  const topLoc = [...locCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topLoc && topLoc[1] >= 2) {
    out.push({
      tone: "warn", icon: "map-pin",
      text: `"${topLoc[0]}" appears in ${topLoc[1]} open issues — possible single root cause.`,
      href: "/admin/issues",
    });
  }

  // 2. Collection trend vs last month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);  const [thisCollected, lastCollected] = await Promise.all([
    db.payment.aggregate({ where: { communityId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { communityId, createdAt: { gte: lastMonthDate, lt: new Date(now.getFullYear(), now.getMonth(), 1) } }, _sum: { amount: true } }),
  ]);
  const a = thisCollected._sum.amount ?? 0;
  const b = lastCollected._sum.amount ?? 0;
  if (b > 0 && a < b * 0.94) {
    out.push({
      tone: "warn", icon: "trending-down",
      text: `Collection is ${(((b - a) / b) * 100).toFixed(0)}% lower than last month (${formatINR(a)} vs ${formatINR(b)}).`,
      href: "/admin/finance",
    });
  } else if (b > 0) {
    out.push({ tone: "good", icon: "trending-up", text: `Collections this month are tracking at or above last month (${formatINR(a)} so far).`, href: "/admin/finance" });
  }

  // 3. Budget overrun check
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [expenses, budget] = await Promise.all([
    db.expense.groupBy({ by: ["category"], where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: yearStart } }, _sum: { amount: true } }),
    db.budgetLine.findMany({ where: { communityId, year: now.getFullYear() } }),
  ]);
  for (const line of budget) {
    const spent = expenses.find((e) => e.category === line.category)?._sum.amount ?? 0;
    if (line.budgetAmount > 0 && spent > line.budgetAmount * 0.85 && monthKey(now) >= `${now.getFullYear()}-09`) {
      out.push({
        tone: "warn", icon: "wallet",
        text: `${line.category} spend (${formatINR(spent)}) is above ${((spent / line.budgetAmount) * 100).toFixed(0)}% of its annual budget.`,
        href: "/admin/finance?tab=budget",
      });
      break;
    }
  }

  // 4. Expiring vendor contracts
  const soon = new Date(now.getTime() + 30 * 86400000);
  const expiring = await db.vendor.count({ where: { communityId, contractEnd: { lte: soon, gte: now } } });
  if (expiring > 0) {
    out.push({ tone: "info", icon: "file-warning", text: `${expiring} vendor contract${expiring > 1 ? "s" : ""} expiring within 30 days — start renewal talks.`, href: "/admin/vendors" });
  }

  // 5. SLA / aging issues
  const aging = issues.filter((i) => now.getTime() - i.createdAt.getTime() > 7 * 86400000 && i.severity !== "LOW");
  if (aging.length > 0) {
    out.push({ tone: "warn", icon: "clock", text: `${aging.length} non-low-severity issue${aging.length > 1 ? "s have" : " has"} been open for over 7 days.`, href: "/admin/issues" });
  }

  // 6. Positive note
  const resolved = await db.issue.count({ where: { communityId, status: { in: ["RESOLVED", "VERIFIED", "CLOSED"] } } });
  if (resolved > 0) {
    out.push({ tone: "good", icon: "check-circle", text: `${resolved} issues resolved to date — most complaints are being closed out.`, href: "/admin/issues" });
  }

  return out.slice(0, 6);
}
