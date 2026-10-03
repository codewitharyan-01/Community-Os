import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatINR } from "@/lib/utils";

function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => (typeof c === "string" && (c.includes(",") || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getSessionUser();
  if (!user || !user.communityId || !can(user.role, "reports.view")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const communityId = user.communityId;
  const { type } = await params;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let rows: (string | number)[][] = [];
  let filename = "report.csv";

  switch (type) {
    case "collection": {
      const invoices = await db.invoice.findMany({
        where: { communityId, status: { not: "VOIDED" }, issuedOn: { gte: yearStart } },
        include: { unit: true, payments: true },
        orderBy: { issuedOn: "asc" },
      });
      rows = [["Invoice", "Unit", "Period", "Issued", "Due", "Amount (INR)", "Status", "Paid on"]];
      invoices.forEach((i) =>
        rows.push([
          i.number, i.unit.label, i.period,
          i.issuedOn.toISOString().slice(0, 10), i.dueOn.toISOString().slice(0, 10),
          i.total, i.status, i.paidAt?.toISOString().slice(0, 10) ?? "",
        ])
      );
      filename = `collection-report-${now.getFullYear()}.csv`;
      break;
    }
    case "outstanding": {
      const invoices = await db.invoice.findMany({
        where: { communityId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
        include: { unit: true },
        orderBy: { dueOn: "asc" },
      });
      rows = [["Invoice", "Unit", "Amount (INR)", "Due date", "Status"]];
      invoices.forEach((i) => rows.push([i.number, i.unit.label, i.total, i.dueOn.toISOString().slice(0, 10), i.status]));
      filename = "outstanding-report.csv";
      break;
    }
    case "expenses": {
      const expenses = await db.expense.findMany({
        where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: yearStart } },
        include: { vendor: true },
        orderBy: { date: "asc" },
      });
      rows = [["Date", "Category", "Description", "Vendor", "Amount (INR)", "Status"]];
      expenses.forEach((e) =>
        rows.push([e.date.toISOString().slice(0, 10), e.category, e.description, e.vendor?.company ?? "", e.amount, e.status])
      );
      filename = `expense-report-${now.getFullYear()}.csv`;
      break;
    }
    case "issues": {
      const issues = await db.issue.findMany({
        where: { communityId },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      });
      rows = [["Reference", "Title", "Category", "Severity", "Status", "Votes", "Reported by", "Created", "Resolved"]];
      issues.forEach((i) =>
        rows.push([
          `#${i.id.slice(-6).toUpperCase()}`, i.title, i.category, i.severity, i.status, i.upvoteCount,
          i.author.name, i.createdAt.toISOString().slice(0, 10), i.resolvedAt?.toISOString().slice(0, 10) ?? "",
        ])
      );
      filename = "issue-report.csv";
      break;
    }
    case "vendors": {
      const vendors = await db.vendor.findMany({ where: { communityId }, orderBy: { company: "asc" } });
      rows = [["Company", "Category", "Contact", "Phone", "Contract start", "Contract end", "Monthly (INR)", "Status"]];
      vendors.forEach((v) =>
        rows.push([
          v.company, v.category, v.contactName, v.phone,
          v.contractStart?.toISOString().slice(0, 10) ?? "", v.contractEnd?.toISOString().slice(0, 10) ?? "",
          v.monthlyAmount, v.status,
        ])
      );
      filename = "vendor-report.csv";
      break;
    }
    case "visitors": {
      const visitors = await db.visitor.findMany({
        where: { communityId },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      rows = [["Pass", "Visitor", "Type", "Host unit window", "Status", "Check-in", "Check-out"]];
      visitors.forEach((v) =>
        rows.push([
          v.passCode, v.name, v.type, v.validFrom.toISOString().slice(0, 10), v.status,
          v.checkedInAt?.toISOString() ?? "", v.checkedOutAt?.toISOString() ?? "",
        ])
      );
      filename = "visitor-report.csv";
      break;
    }
    case "financial": {
      const ledger = await db.ledgerEntry.findMany({ where: { communityId }, orderBy: { date: "asc" } });
      rows = [["Date", "Type", "Category", "Description", "Amount (INR)"]];
      ledger.forEach((l) => rows.push([l.date.toISOString().slice(0, 10), l.type, l.category, l.description, l.type === "INCOME" ? l.amount : -l.amount]));
      const income = ledger.filter((l) => l.type === "INCOME").reduce((s, l) => s + l.amount, 0);
      const expense = ledger.filter((l) => l.type === "EXPENSE").reduce((s, l) => s + l.amount, 0);
      rows.push([]);
      rows.push(["", "", "", "Net position (INR)", income - expense]);
      filename = `financial-report-${now.getFullYear()}.csv`;
      break;
    }
    default:
      return new NextResponse("Unknown report type", { status: 404 });
  }

  void formatINR;
  return new NextResponse(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
