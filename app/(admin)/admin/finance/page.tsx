import { TrendingUp, TrendingDown, FileText, Landmark, Scale } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { BillingRunModal, ExpenseModal } from "@/components/admin/admin-client";
import { RemindersButton, ManualPaymentModal } from "@/components/admin/crud";
import { FinanceRowActions } from "@/components/admin/issue-controls";
import { VoidButton } from "@/components/admin/finance-controls";
import { formatINR, formatDate, periodLabel, formatINRCompact } from "@/lib/utils";
import { BudgetVsActualChart } from "@/components/charts/charts";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Finance" };

export default async function AdminFinance({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const { tab } = await searchParams;
  const active = tab ?? "overview";
  const canApprove = can(user.role, "finance.approve");
  const canManage = can(user.role, "finance.manage");
  const canBill = can(user.role, "billing.run");

  const counts = await db.invoice.groupBy({ by: ["status"], where: { communityId }, _count: true });
  const [buildings, vendorOptions] = await Promise.all([
    db.building.findMany({ where: { communityId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.vendor.findMany({ where: { communityId }, select: { id: true, company: true }, orderBy: { company: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Billing, collections, expenses, ledger and budget — one money view."
        action={
          <div className="flex flex-wrap gap-2">
            {(canManage || canBill) && <RemindersButton />}
            {canBill && <BillingRunModal buildings={buildings} />}
            {canManage && <ExpenseModal vendors={vendorOptions} />}
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "invoices", label: "Invoices", count: counts.find((c) => c.status === "PENDING")?._count },
          { id: "expenses", label: "Expenses" },
          { id: "ledger", label: "Ledger" },
          { id: "budget", label: "Budget" },
        ]}
        className="mb-6"
      />

      {active === "overview" && <FinanceOverview communityId={communityId} />}
      {active === "invoices" && <InvoicesTab communityId={communityId} canManage={canManage} />}
      {active === "expenses" && <ExpensesTab communityId={communityId} canApprove={canApprove} canManage={canManage} />}
      {active === "ledger" && <LedgerTab communityId={communityId} />}
      {active === "budget" && <BudgetTab communityId={communityId} />}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

async function FinanceOverview({ communityId }: { communityId: string }) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [invoices, payments, expenses, budget, vendorRows] = await Promise.all([
    db.invoice.findMany({ where: { communityId, status: { not: "VOIDED" }, issuedOn: { gte: yearStart } } }),
    db.payment.findMany({ where: { communityId, createdAt: { gte: yearStart } } }),
    db.expense.findMany({ where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: yearStart } } }),
    db.budgetLine.findMany({ where: { communityId, year: now.getFullYear() }, orderBy: { category: "asc" } }),
    db.vendor.findMany({ where: { communityId }, select: { company: true, monthlyAmount: true, contractEnd: true } }),
  ]);

  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, billed - collected);
  const rate = billed > 0 ? (collected / billed) * 100 : 100;
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const budgetTotal = budget.reduce((s, b) => s + b.budgetAmount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total due (YTD)" value={formatINRCompact(billed)} />
        <StatCard label="Collected" value={formatINRCompact(collected)} tone="green" />
        <StatCard label="Outstanding" value={formatINRCompact(outstanding)} tone="orange" />
        <StatCard label="Collection rate" value={`${rate.toFixed(1)}%`} />
        <StatCard label="Spent (YTD)" value={formatINRCompact(spent)} sub={budgetTotal > 0 ? `${((spent / budgetTotal) * 100).toFixed(0)}% of budget` : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Scale className="w-4 h-4" /> Budget vs actual (YTD)</p>
          {budget.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No budget lines configured yet.</p>
          ) : (
            <BudgetVsActualChart
              data={budget.map((b) => ({
                category: b.category.charAt(0) + b.category.slice(1).toLowerCase(),
                budget: b.budgetAmount,
                actual: expenses.filter((e) => e.category === b.category).reduce((s, e) => s + e.amount, 0),
              }))}
            />
          )}
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold mb-1">Vendor commitments</p>
          <div className="divide-y divide-[var(--border)]">
            {vendorRows.map((v) => (
              <div key={v.company} className="py-2.5 flex items-center justify-between text-sm">
                <span>{v.company}</span>
                <span className="num text-muted-foreground">{formatINR(v.monthlyAmount)}/mo</span>
              </div>
            ))}
            {vendorRows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No vendors.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

async function InvoicesTab({ communityId, canManage }: { communityId: string; canManage: boolean }) {
  const invoices = await db.invoice.findMany({
    where: { communityId },
    orderBy: { issuedOn: "desc" },
    take: 100,
    include: { unit: true, payments: true },
  });

  type Row = (typeof invoices)[number] & { id: string };

  const columns: Column<Row>[] = [
    { key: "number", header: "Invoice", render: (r) => <span className="font-mono text-xs">{r.number}</span>, mobilePrimary: (r) => <span className="font-mono text-xs">{r.number}</span> },
    { key: "unit", header: "Unit", render: (r) => r.unit.label, mobilePrimary: (r) => r.unit.label },
    { key: "period", header: "Period", render: (r) => <span className="text-xs">{periodLabel(r.period)}</span>, mobileSecondary: (r) => periodLabel(r.period) },
    { key: "total", header: "Amount", render: (r) => <span className="font-medium num">{formatINR(r.total)}</span>, mobilePrimary: (r) => formatINR(r.total) },
    { key: "due", header: "Due", render: (r) => <span className="text-xs">{formatDate(r.dueOn)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
    ...(canManage
      ? [{
          key: "actions",
          header: "",
          render: (r: Row) =>
            r.status === "PENDING" || r.status === "OVERDUE" || r.status === "PARTIAL" ? (
              <div className="flex items-center justify-end gap-1.5">
                <ManualPaymentModal invoice={{ id: r.id, number: r.number, unitLabel: r.unit.label, total: r.total }} />
                <VoidButton invoiceId={r.id} />
              </div>
            ) : null,
          mobileRight: (r: Row) =>
            r.status === "PENDING" || r.status === "OVERDUE" || r.status === "PARTIAL" ? (
              <ManualPaymentModal invoice={{ id: r.id, number: r.number, unitLabel: r.unit.label, total: r.total }} />
            ) : null,
        }]
      : []),
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        rows={invoices}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.unit.label}</p>
            <p className="text-2xs text-muted-foreground font-mono">{r.number}</p>
          </div>
        )}
        empty={<EmptyState icon={<FileText className="w-5 h-5" />} title="No invoices" body="Run a billing cycle to generate the first invoices." />}
      />
    </div>
  );
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

async function ExpensesTab({ communityId, canApprove, canManage }: { communityId: string; canApprove: boolean; canManage: boolean }) {
  const expenses = await db.expense.findMany({
    where: { communityId },
    orderBy: { date: "desc" },
    take: 60,
    include: { vendor: true },
  });

  type Row = (typeof expenses)[number] & { id: string };

  const columns: Column<Row>[] = [
    { key: "desc", header: "Expense", render: (r) => <div><p className="font-medium">{r.description}</p><p className="text-xs text-muted-foreground">{r.vendor?.company ?? "One-time"}</p></div>, mobilePrimary: (r) => <span className="font-medium">{r.description}</span> },
    { key: "category", header: "Category", render: (r) => <span className="text-xs">{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</span>, mobileSecondary: (r) => r.category.toLowerCase() },
    { key: "amount", header: "Amount", render: (r) => <span className="font-medium num">{formatINR(r.amount)}</span>, mobilePrimary: (r) => formatINR(r.amount) },
    { key: "date", header: "Date", render: (r) => <span className="text-xs">{formatDate(r.date)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} />, mobileRight: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions", header: "",
      render: (r) => <FinanceRowActions expenseId={r.id} status={r.status} canApprove={canApprove} canManage={canManage} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={expenses}
      mobileTitle={(r) => (
        <div>
          <p className="text-sm font-medium">{r.description}</p>
          <p className="text-2xs text-muted-foreground">{formatDate(r.date)}</p>
        </div>
      )}
      empty={<EmptyState icon={<Landmark className="w-5 h-5" />} title="No expenses recorded" body="Vendor bills and society expenses appear here for approval." />}
    />
  );
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

async function LedgerTab({ communityId }: { communityId: string }) {
  const entries = await db.ledgerEntry.findMany({
    where: { communityId },
    orderBy: { date: "desc" },
    take: 80,
  });

  return (
    <div>
      <DataTable
        columns={[
          { key: "date", header: "Date", render: (r) => <span className="text-xs">{formatDate(r.date)}</span>, mobilePrimary: (r) => formatDate(r.date) },
          { key: "type", header: "Type", render: (r) => <StatusBadge status="OPEN" label={r.type} />, mobileSecondary: (r) => r.type },
          { key: "desc", header: "Description", render: (r) => <span className="text-sm">{r.description}</span>, mobilePrimary: (r) => r.description },
          { key: "category", header: "Category", render: (r) => <span className="text-xs text-muted-foreground">{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</span> },
          {
            key: "amount", header: "Amount",
            render: (r) => (
              <span className={`font-medium num ${r.type === "INCOME" ? "text-[var(--status-green)]" : "text-foreground"}`}>
                {r.type === "INCOME" ? "+" : "−"}{formatINR(r.amount)}
              </span>
            ),
            mobilePrimary: (r) => `${r.type === "INCOME" ? "+" : "−"}${formatINR(r.amount)}`,
            mobileRight: (r) => <StatusBadge status="OPEN" label={r.type} />,
          },
        ] as Column<(typeof entries)[number] & { id: string }>[]}
        rows={entries}
        mobileTitle={(r) => <p className="text-sm font-medium">{r.description}</p>}
        empty={<EmptyState icon={<TrendingUp className="w-5 h-5" />} title="Ledger is empty" body="Income and expense entries post here automatically." />}
      />
    </div>
  );
}

// ─── Budget ───────────────────────────────────────────────────────────────────

async function BudgetTab({ communityId }: { communityId: string }) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [budget, expenses] = await Promise.all([
    db.budgetLine.findMany({ where: { communityId, year: now.getFullYear() }, orderBy: { category: "asc" } }),
    db.expense.groupBy({ by: ["category"], where: { communityId, status: { in: ["APPROVED", "PAID"] }, date: { gte: yearStart } }, _sum: { amount: true } }),
  ]);

  return (
    <div>
      <DataTable
        columns={[
          { key: "category", header: "Category", render: (r) => <span className="font-medium">{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</span>, mobilePrimary: (r) => r.category },
          { key: "budget", header: "Annual budget", render: (r) => <span className="num">{formatINR(r.budgetAmount)}</span>, mobilePrimary: (r) => formatINR(r.budgetAmount) },
          {
            key: "actual", header: "Spent (YTD)",
            render: (r) => {
              const actual = expenses.find((e) => e.category === r.category)?._sum.amount ?? 0;
              const pct = r.budgetAmount > 0 ? (actual / r.budgetAmount) * 100 : 0;
              return (
                <span className={`num ${pct > 90 ? "text-[var(--status-orange)] font-medium" : ""}`}>
                  {formatINR(actual)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                </span>
              );
            },
            mobilePrimary: (r) => formatINR(expenses.find((e) => e.category === r.category)?._sum.amount ?? 0),
          },
          { key: "notes", header: "Notes", render: (r) => <span className="text-xs text-muted-foreground">{r.notes || "—"}</span> },
        ] as Column<(typeof budget)[number] & { id: string }>[]}
        rows={budget}
        mobileTitle={(r) => <p className="text-sm font-medium">{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</p>}
        empty={<EmptyState icon={<TrendingDown className="w-5 h-5" />} title="No budget configured" body="Set annual budget lines to track variance." />}
      />
    </div>
  );
}
