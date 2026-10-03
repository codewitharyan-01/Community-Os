// Local AI layer — deterministic, permission-aware, grounded in platform data.
// Understands English + Hindi/Hinglish phrasing. If an LLM API key is configured,
// `askResidentAI` / `askAdminAI` are the single seams to upgrade; every answer is
// composed from scoped tool-queries, never fabricated.

import { db } from "@/lib/db";
import { formatINR, formatDate, formatTime, relativeTime, periodLabel } from "@/lib/utils";
import { ISSUE_STATUS_LABELS } from "@/lib/constants";
import { communityHealth, type HealthScore } from "@/lib/ai-health";

export { communityHealth, type HealthScore };

export type AIResult = { answer: string; links?: { label: string; href: string }[] };

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

// ─── Resident assistant ───────────────────────────────────────────────────────

export async function askResidentAI(
  userId: string,
  unitId: string | null,
  question: string
): Promise<AIResult> {
  const q = question.toLowerCase().trim();

  // 1. Dues / bills — "how much do I owe", "मेरा बिल कितना है", "maintenance kitna"
  if (has(q, ["owe", "due", "bill", "maintenance", "pay", "balance", "pending", "kitna", "baaki", "baki", "outstanding", "paisa", "amount", "बिल", "बकाया", "भुगतान", "कितना"])) {
    const invoices = unitId
      ? await db.invoice.findMany({
          where: { unitId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
          orderBy: { dueOn: "asc" },
        })
      : [];
    const total = invoices.reduce((s, i) => s + i.total, 0);
    if (!invoices.length) {
      return {
        answer: "You have no outstanding bills right now — everything is paid up. 🎉",
        links: [{ label: "Payment history", href: "/resident/payments" }],
      };
    }
    const overdue = invoices.filter((i) => i.status === "OVERDUE");
    return {
      answer:
        `Your current outstanding amount is ${formatINR(total)} across ${invoices.length} invoice${invoices.length > 1 ? "s" : ""}.\n\n` +
        invoices.map((i) => `• ${i.number} — ${formatINR(i.total)} (${periodLabel(i.period)}, due ${formatDate(i.dueOn)}${i.status === "OVERDUE" ? " · overdue" : ""})`).join("\n") +
        (overdue.length
          ? `\n\n⚠️ ${overdue.length} invoice${overdue.length > 1 ? "s are" : " is"} overdue — please clear ${formatINR(overdue.reduce((s, i) => s + i.total, 0))} to avoid late fees.`
          : `\n\nYou can pay in one tap via UPI.`),
      links: [{ label: "Pay now", href: "/resident/payments" }],
    };
  }

  // 2. Payment history / receipts
  if (has(q, ["receipt", "history", "paid", "payment", "transaction", "jama", "रसीद", "इतिहास"])) {
    const payments = await db.payment.findMany({
      where: { userId, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { invoice: { include: { unit: true } } },
    });
    if (!payments.length) {
      return { answer: "You haven't made any payments yet. Your bills appear in the Payments tab.", links: [{ label: "Payments", href: "/resident/payments" }] };
    }
    return {
      answer:
        `Your last ${payments.length} payment${payments.length > 1 ? "s" : ""}:\n\n` +
        payments.map((p) => `• ${formatINR(p.amount)} — ${p.invoice.unit.label}, ${p.method} · ${formatDate(p.createdAt)} · ${p.receiptNumber}`).join("\n"),
      links: [{ label: "All payments & receipts", href: "/resident/payments" }],
    };
  }

  // 3. Complaints / issues — "is my complaint resolved", "meri shikayat"
  if (has(q, ["complaint", "issue", "leak", "report", "ticket", "shikayat", "problem", "fix", "repair", "theek", "शिकायत", "लीक", "सुधार", "समस्या"])) {
    const issues = await db.issue.findMany({
      where: { authorId: userId, status: { notIn: ["CLOSED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        assignedToUser: { select: { name: true } },
        assignedVendor: { select: { company: true } },
        timeline: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!issues.length) {
      return {
        answer: "You have no open complaints. If something needs fixing, report it in a few taps — the committee is notified instantly.",
        links: [{ label: "Report an issue", href: "/resident/services/issues/new" }],
      };
    }
    const lines = issues.map((i) => {
      const assignee = i.assignedToUser?.name ?? i.assignedVendor?.company;
      const last = i.timeline[0];
      return `• "${i.title}" — ${ISSUE_STATUS_LABELS[i.status] ?? i.status}${assignee ? ` (with ${assignee})` : ""}${last ? ` · last update: ${last.note || "status change"}, ${relativeTime(last.createdAt)}` : ""}`;
    });
    return {
      answer: `You have ${issues.length} open issue${issues.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`,
      links: issues.slice(0, 3).map((i) => ({ label: `Track: ${i.title.slice(0, 26)}…`, href: `/resident/services/issues/${i.id}` })),
    };
  }

  // 4. Events — "what's happening this weekend", "is weekend kya hai"
  if (has(q, ["event", "weekend", "happening", "festival", "celebration", "function", "karyakram", "diwali", "holi", "navratri", "meeting", "agenda", "today", "tomorrow", "aaj", "kal", "इवेंट", "समारोह", "त्योहार", "सप्ताहांत", "कल"])) {
    const communityId = unitId ? (await db.unit.findUnique({ where: { id: unitId }, select: { communityId: true } }))?.communityId : null;
    const events = communityId
      ? await db.event.findMany({
          where: { communityId, startsAt: { gte: new Date() }, cancelled: false },
          orderBy: { startsAt: "asc" },
          take: 4,
          include: { registrations: { where: { userId }, select: { rsvp: true } } },
        })
      : [];
    if (!events.length) return { answer: "No upcoming events are scheduled right now." };
    const weekend = has(q, ["weekend"]);
    const filtered = weekend ? events.filter((e) => [0, 6].includes(e.startsAt.getDay())) : events;
    const list = (filtered.length ? filtered : events).map((e) => {
      const mine = e.registrations[0]?.rsvp;
      return `• ${e.title} — ${formatDate(e.startsAt)} at ${formatTime(e.startsAt)}${e.location ? `, ${e.location}` : ""}${mine === "YES" ? " · you're going ✓" : ""}`;
    });
    return {
      answer: `Here's what's coming up:\n\n${list.join("\n")}`,
      links: [{ label: "RSVP & details", href: "/resident/community?tab=events" }],
    };
  }

  // 5. Parking — "what's my parking slot", "mera parking"
  if (has(q, ["parking", "slot", "vehicle", "car", "gaadi", "gadi", "bike", "पार्किंग", "गाड़ी", "कार"])) {
    const unit = unitId
      ? await db.unit.findUnique({ where: { id: unitId }, include: { parkingSlots: true, vehicles: true } })
      : null;
    if (!unit) return { answer: "I couldn't find your unit. Please ask the admin to link your account." };
    const slotLine = unit.parkingSlots.length ? unit.parkingSlots.map((s) => s.code).join(", ") : "no dedicated slot assigned";
    const vehLine = unit.vehicles.length
      ? unit.vehicles.map((v) => `${v.number}${v.model ? ` (${v.model})` : ""}`).join(", ")
      : "no vehicles registered";
    return {
      answer: `Your parking: ${slotLine}.\nYour registered vehicles: ${vehLine}.\n\nTip: you can look up any vehicle by number — owner details stay privacy-masked.`,
      links: [{ label: "My parking", href: "/resident/services/parking" }],
    };
  }

  // 6. Visitors — "who is visiting me", "mera mehmaan"
  if (has(q, ["visitor", "guest", "mehman", "arriving", "aayega", "visit", "आगंतुक", "मेहमान", "अतिथि"])) {
    const visitors = await db.visitor.findMany({
      where: { hostUserId: userId, status: "EXPECTED", validTo: { gte: new Date() } },
      orderBy: { validFrom: "asc" },
      take: 5,
    });
    if (!visitors.length) {
      return { answer: "You have no expected visitors. Invite one anytime — they get a QR pass for smooth entry.", links: [{ label: "Invite visitor", href: "/resident/services/visitors" }] };
    }
    return {
      answer: `Expected visitors:\n\n${visitors.map((v) => `• ${v.name} — ${formatDate(v.validFrom)} at ${formatTime(v.validFrom)} (pass ${v.passCode})`).join("\n")}`,
      links: [{ label: "Visitor passes", href: "/resident/services/visitors" }],
    };
  }

  // 7. Community pulse — polls & announcements
  if (has(q, ["poll", "vote", "announcement", "post", "feed", "news", "community", "मतदान", "सूचना", "समुदाय"])) {
    const communityId = unitId ? (await db.unit.findUnique({ where: { id: unitId }, select: { communityId: true } }))?.communityId : null;
    if (!communityId) return { answer: "Ask the admin to link you to a unit first." };
    const [openPolls, recentPosts] = await Promise.all([
      db.poll.findMany({ where: { communityId, closed: false, endsAt: { gte: new Date() } }, take: 3, include: { _count: { select: { votes: true } } } }),
      db.post.findMany({ where: { communityId, hidden: false, type: "ANNOUNCEMENT" }, orderBy: { createdAt: "desc" }, take: 3 }),
    ]);
    const parts: string[] = [];
    if (openPolls.length) parts.push(`Open polls:\n${openPolls.map((p) => `• ${p.question} (${p._count.votes} votes)`).join("\n")}`);
    if (recentPosts.length) parts.push(`Latest announcements:\n${recentPosts.map((p) => `• ${p.title || p.body.slice(0, 60)}`).join("\n")}`);
    if (!parts.length) return { answer: "No active polls or recent announcements right now." };
    return { answer: parts.join("\n\n"), links: [{ label: "Open community", href: "/resident/community" }] };
  }

  // 8. Household / profile
  if (has(q, ["flat", "unit", "household", "family", "profile", "member", "ghar", "फ्लैट", "घर", "परिवार"])) {
    const unit = unitId
      ? await db.unit.findUnique({
          where: { id: unitId },
          include: { building: true, members: { include: { user: { select: { name: true, role: true } } } } },
        })
      : null;
    if (!unit) return { answer: "I couldn't find your unit details." };
    return {
      answer: `You're at ${unit.label}, ${unit.building.name} (floor ${unit.floor}), ~${unit.areaSqft} sq.ft.\nHousehold: ${unit.householdName || "—"}\nMembers: ${unit.members.map((m) => `${m.user.name} (${m.type.toLowerCase().replace("_", " ")})`).join(", ")}`,
      links: [{ label: "My profile", href: "/resident/profile" }],
    };
  }

  // Fallback
  return {
    answer:
      "I can help with:\n• Dues — \"how much do I owe?\" / \"मेरा बिल कितना है?\"\n• Complaints — \"is my complaint resolved?\"\n• Events — \"what's happening this weekend?\"\n• Parking — \"what's my parking slot?\"\n• Visitors — \"who is visiting me?\"\n• Payments — \"show my receipts\"\n• Community — \"any active polls?\"",
    links: [],
  };
}

// ─── Admin assistant ──────────────────────────────────────────────────────────

export async function askAdminAI(communityId: string, question: string): Promise<AIResult> {
  const q = question.toLowerCase().trim();
  const now = new Date();

  // 1. Attention brief
  if (has(q, ["attention", "today", "focus", "priority", "brief", "summary", "dashboard", "overview", "dhyan", "आज", "ध्यान"])) {
    const [brief, health] = await Promise.all([buildAttentionBrief(communityId), communityHealth(communityId)]);
    return {
      answer: `${brief}\n\nCommunity health: ${health.overall}/100 (financial ${health.financial}, operational ${health.operational}, maintenance ${health.maintenance}, engagement ${health.engagement}).`,
      links: [
        { label: "Overview", href: "/admin" },
        { label: "Issue queue", href: "/admin/issues" },
      ],
    };
  }

  // 2. Overdue / defaulters
  if (has(q, ["overdue", "outstanding", "default", "not paid", "unpaid", "baaki", "due", "बकाया", "बिल"])) {
    const rows = await db.invoice.findMany({
      where: { communityId, status: { in: ["OVERDUE", "PENDING", "PARTIAL"] }, dueOn: { lt: now } },
      include: { unit: true },
      orderBy: { dueOn: "asc" },
      take: 8,
    });
    const totalAgg = await db.invoice.aggregate({
      where: { communityId, status: { in: ["OVERDUE", "PENDING", "PARTIAL"] }, dueOn: { lt: now } },
      _sum: { total: true },
      _count: true,
    });
    if (!rows.length) return { answer: "No invoices are past their due date. Collection is fully on track. 🎉" };
    return {
      answer:
        `${totalAgg._count} invoice${totalAgg._count > 1 ? "s" : ""} past due, totalling ${formatINR(totalAgg._sum.total ?? 0)}. Oldest first:\n\n` +
        rows.map((i) => `• ${i.unit.label} — ${formatINR(i.total)} (due ${formatDate(i.dueOn)})`).join("\n") +
        `\n\nTip: use "Send due reminders" in Finance to nudge all of them at once.`,
      links: [
        { label: "Open finance", href: "/admin/finance?tab=invoices" },
        { label: "Outstanding report (CSV)", href: "/api/reports/outstanding" },
      ],
    };
  }

  // 3. Issues
  if (has(q, ["issue", "problem", "complaint", "unresolved", "top", "trending", "shikayat", "शिकायत", "समस्या"])) {
    const issues = await db.issue.findMany({
      where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { assignedToUser: { select: { name: true } }, assignedVendor: { select: { company: true } } },
    });
    if (!issues.length) return { answer: "No unresolved issues — the community is in good shape. 🎉" };
    return {
      answer:
        `Top unresolved issues (by community votes):\n\n` +
        issues
          .map((i) => {
            const assignee = i.assignedToUser ? ` (with ${i.assignedToUser.name})` : i.assignedVendor ? ` (with ${i.assignedVendor.company})` : ", unassigned";
            return `• [${i.severity}] ${i.title} — ${i.upvoteCount} votes, ${ISSUE_STATUS_LABELS[i.status] ?? i.status}${assignee}`;
          })
          .join("\n"),
      links: [{ label: "Issue queue", href: "/admin/issues" }],
    };
  }

  // 4. Expenses
  if (has(q, ["expense", "spend", "spent", "cost", "kharcha", "खर्च"])) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await db.expense.findMany({
      where: { communityId, date: { gte: monthStart }, status: { in: ["APPROVED", "PAID"] } },
    });
    const pending = await db.expense.count({ where: { communityId, status: "PENDING_APPROVAL" } });
    const byCat = new Map<string, number>();
    expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const lines = [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `• ${c.charAt(0) + c.slice(1).toLowerCase()} — ${formatINR(v)}`).join("\n");
    return {
      answer:
        (expenses.length
          ? `This month's approved spend is ${formatINR(total)}:\n\n${lines}`
          : "No expenses have been approved yet this month.") +
        (pending ? `\n\n⏳ ${pending} expense${pending > 1 ? "s" : ""} awaiting approval.` : ""),
      links: [{ label: "Expenses", href: "/admin/finance?tab=expenses" }],
    };
  }

  // 5. Vendors / contracts
  if (has(q, ["contract", "vendor", "expir", "renewal", "renew", "वेंडर", "ठेकेदार"])) {
    const soon = new Date(now.getTime() + 45 * 86400000);
    const vendors = await db.vendor.findMany({
      where: { communityId, contractEnd: { lte: soon } },
      orderBy: { contractEnd: "asc" },
    });
    if (!vendors.length) return { answer: "No vendor contracts expire in the next 45 days." };
    return {
      answer: `Contracts expiring soon:\n\n${vendors.map((v) => `• ${v.company} (${v.category.toLowerCase()}) — ends ${formatDate(v.contractEnd)} · ${formatINR(v.monthlyAmount)}/mo`).join("\n")}`,
      links: [{ label: "Vendors", href: "/admin/vendors" }],
    };
  }

  // 6. Collections snapshot
  if (has(q, ["collection", "collected", "income", "revenue", "rate", "jama", "वसूली", "आय"])) {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [invoices, payments] = await Promise.all([
      db.invoice.aggregate({ where: { communityId, status: { not: "VOIDED" }, issuedOn: { gte: yearStart } }, _sum: { total: true } }),
      db.payment.aggregate({ where: { communityId, createdAt: { gte: yearStart } }, _sum: { amount: true } }),
    ]);
    const billed = invoices._sum.total ?? 0;
    const collected = payments._sum.amount ?? 0;
    const rate = billed > 0 ? ((collected / billed) * 100).toFixed(1) : "100";
    return {
      answer: `Year to date: billed ${formatINR(billed)}, collected ${formatINR(collected)} — a collection rate of ${rate}%. Outstanding: ${formatINR(Math.max(0, billed - collected))}.`,
      links: [{ label: "Finance", href: "/admin/finance" }],
    };
  }

  // 7. Community size
  if (has(q, ["resident", "member", "how many", "family", "population"])) {
    const [residents, units, occupied] = await Promise.all([
      db.user.count({ where: { communityId, role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] }, active: true } }),
      db.unit.count({ where: { communityId } }),
      db.unit.count({ where: { communityId, status: "OCCUPIED" } }),
    ]);
    return {
      answer: `The community has ${residents} active residents across ${occupied} occupied units (${units - occupied} vacant).`,
      links: [{ label: "Residents", href: "/admin/residents" }],
    };
  }

  // 8. Polls
  if (has(q, ["poll", "vote", "voting", "result"])) {
    const polls = await db.poll.findMany({
      where: { communityId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { options: { include: { _count: { select: { votes: true } } } }, _count: { select: { votes: true } } },
    });
    if (!polls.length) return { answer: "No polls have been created yet." };
    return {
      answer:
        `Recent polls:\n\n` +
        polls
          .map((p) => {
            const top = [...p.options].sort((a, b) => b._count.votes - a._count.votes)[0];
            const pct = p._count.votes > 0 ? Math.round((top._count.votes / p._count.votes) * 100) : 0;
            return `• ${p.question} — ${p._count.votes} votes${top ? `, leading: "${top.label}" (${pct}%)` : ""}${p.closed || p.endsAt < now ? " · closed" : " · open"}`;
          })
          .join("\n"),
      links: [{ label: "Polls", href: "/admin/community?tab=polls" }],
    };
  }

  // Fallback
  return {
    answer:
      "I can answer from your community's live data:\n• \"What needs my attention today?\"\n• \"Show overdue residents\"\n• \"What are the top unresolved issues?\"\n• \"Summarize this month's expenses\"\n• \"Which vendor contracts expire soon?\"\n• \"How is the collection rate?\"\n• \"Show poll results\"",
    links: [],
  };
}

// ─── Attention brief ──────────────────────────────────────────────────────────

export async function buildAttentionBrief(communityId: string): Promise<string> {
  const now = new Date();
  const [openIssues, critical, overdueInv, expiringVendors, incidents, expectedVisitors] = await Promise.all([
    db.issue.count({ where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } } }),
    db.issue.count({ where: { communityId, status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] }, severity: "CRITICAL" } }),
    db.invoice.findMany({ where: { communityId, status: { in: ["OVERDUE", "PENDING", "PARTIAL"] }, dueOn: { lt: now } } }),
    db.vendor.count({ where: { communityId, contractEnd: { lte: new Date(now.getTime() + 30 * 86400000) } } }),
    db.securityIncident.count({ where: { communityId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.visitor.count({ where: { communityId, status: "EXPECTED", validTo: { gte: now } } }),
  ]);
  const outstanding = overdueInv.reduce((s, i) => s + i.total, 0);
  const parts = [
    critical ? `🔴 ${critical} critical issue${critical > 1 ? "s" : ""} need immediate action` : null,
    overdueInv.length ? `🟠 ${formatINR(outstanding)} outstanding across ${overdueInv.length} past-due invoice${overdueInv.length > 1 ? "s" : ""}` : null,
    openIssues ? `🔵 ${openIssues} open issue${openIssues > 1 ? "s" : ""} in the queue` : null,
    expiringVendors ? `🟠 ${expiringVendors} vendor contract${expiringVendors > 1 ? "s" : ""} expiring within 30 days` : null,
    incidents ? `🟣 ${incidents} open security incident${incidents > 1 ? "s" : ""}` : null,
    expectedVisitors ? `🟢 ${expectedVisitors} visitor${expectedVisitors > 1 ? "s" : ""} expected on premises` : null,
    !critical && !incidents ? "🟢 No emergencies — operations are calm" : null,
  ].filter(Boolean) as string[];
  return `TODAY:\n\n${parts.join("\n")}`;
}

