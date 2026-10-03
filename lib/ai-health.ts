// Community Health Score — admin decision-support metrics computed live.
import { db } from "@/lib/db";

export type HealthScore = {
  financial: number;
  operational: number;
  engagement: number;
  maintenance: number;
  overall: number;
  notes: string[];
};

export async function communityHealth(communityId: string): Promise<HealthScore> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [invoices, paidInvoices, expenses, budgetLines, openIssues, resolvedIssues, polls, votes, events, regs, assets] =
    await Promise.all([
      db.invoice.findMany({ where: { communityId, status: { not: "VOIDED" }, issuedOn: { gte: yearStart } }, select: { total: true, status: true, dueOn: true } }),
      db.payment.findMany({ where: { communityId, createdAt: { gte: yearStart } }, select: { amount: true } }),
      db.expense.findMany({ where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: yearStart } }, select: { amount: true, category: true } }),
      db.budgetLine.findMany({ where: { communityId, year: now.getFullYear() } }),
      db.issue.count({ where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } } }),
      db.issue.count({ where: { communityId, status: { in: ["RESOLVED", "VERIFIED", "CLOSED"] } } }),
      db.poll.findMany({ where: { communityId }, select: { id: true, createdAt: true } }),
      db.pollVote.findMany({ where: { poll: { communityId } }, select: { pollId: true, userId: true } }),
      db.event.count({ where: { communityId, startsAt: { gte: yearStart } } }),
      db.eventRegistration.count({ where: { event: { communityId }, rsvp: "YES" } }),
      db.asset.findMany({ where: { communityId, active: true }, select: { condition: true, nextServiceAt: true } }),
    ]);

  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const collected = paidInvoices.reduce((s, p) => s + p.amount, 0);
  const collectionRate = billed > 0 ? collected / billed : 1;

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const budgetTotal = budgetLines.reduce((s, b) => s + b.budgetAmount, 0);
  const overspend = budgetTotal > 0 ? spent / budgetTotal : 0;
  const financial = Math.round(Math.max(0, Math.min(1, collectionRate * 0.75 + (1 - Math.max(0, overspend - 0.9)) * 0.25)) * 100);

  const resolutionTotal = openIssues + resolvedIssues;
  const resolutionRate = resolutionTotal > 0 ? resolvedIssues / resolutionTotal : 1;
  const operational = Math.round(Math.max(0, Math.min(1, resolutionRate * 0.8 + (openIssues <= 8 ? 0.2 : 0.05))) * 100);

  const recentPolls = polls.filter((p) => p.createdAt >= monthStart);
  const residents = await db.user.count({ where: { communityId, role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] }, active: true } });
  const pollPart = recentPolls.length > 0 ? new Set(votes.filter((v) => recentPolls.some((p) => p.id === v.pollId)).map((v) => v.pollId + v.userId)).size / Math.max(recentPolls.length * residents, 1) : 0.5;
  const rsvpRate = events > 0 ? Math.min(regs / Math.max(events * residents * 0.1, 1), 1) : 0.5;
  const engagement = Math.round(Math.max(0.05, Math.min(1, pollPart * 0.5 + rsvpRate * 0.5)) * 100);

  const goodAssets = assets.filter((a) => a.condition === "EXCELLENT" || a.condition === "GOOD").length;
  const onTimeService = assets.filter((a) => !a.nextServiceAt || a.nextServiceAt >= now).length;
  const maintenance = Math.round(
    Math.max(0, Math.min(1, (assets.length ? goodAssets / assets.length : 1) * 0.5 + (assets.length ? onTimeService / assets.length : 1) * 0.5)) * 100
  );

  const overall = Math.round(financial * 0.35 + operational * 0.3 + maintenance * 0.2 + engagement * 0.15);

  const notes: string[] = [];
  if (collectionRate < 0.85) notes.push(`Collection rate is ${(collectionRate * 100).toFixed(0)}% — below the 85% target.`);
  if (openIssues > 10) notes.push(`${openIssues} open issues — consider a review of assignment load.`);
  if (overspend > 0.9) notes.push(`Spend has reached ${(overspend * 100).toFixed(0)}% of the annual budget.`);
  if (pollPart < 0.3 && recentPolls.length > 0) notes.push("Poll participation is low — announcements could highlight active votes.");
  if (notes.length === 0) notes.push("All tracked metrics are within healthy ranges.");

  return { financial, operational, engagement, maintenance, overall, notes };
}

