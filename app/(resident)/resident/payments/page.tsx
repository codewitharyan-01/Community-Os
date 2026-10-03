import { Wallet, ReceiptText, Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR, formatDate, periodLabel } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle, SectionTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PayButton } from "@/components/payments/pay-button";
import { PageHeader } from "@/components/ui/stat";

export const metadata = { title: "Payments" };

export default async function ResidentPayments() {
  const user = await requireCommunityUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { unit: true },
  });
  const unitId = membership?.unitId;

  const [openInvoices, paidInvoices, monthIncome, monthExpense, topExpenses] = await Promise.all([
    unitId
      ? db.invoice.findMany({
          where: { unitId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
          orderBy: { dueOn: "asc" },
        })
      : [],
    unitId
      ? db.invoice.findMany({
          where: { unitId, status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 12,
          include: { payments: true },
        })
      : [],
    db.ledgerEntry.aggregate({
      where: { communityId: user.communityId!, type: "INCOME", date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amount: true },
    }),
    db.ledgerEntry.aggregate({
      where: { communityId: user.communityId!, type: "EXPENSE", date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amount: true },
    }),
    db.expense.findMany({
      where: { communityId: user.communityId!, status: { in: ["APPROVED", "PAID"] }, date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      orderBy: { amount: "desc" },
      take: 4,
    }),
  ]);

  const totalDue = openInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <PageHeader title="Payments" subtitle={`Bills and receipts for ${membership?.unit.label ?? "your unit"}.`} />

      {/* Due invoices */}
      <SectionTitle>Current bill{openInvoices.length !== 1 ? "s" : ""}</SectionTitle>
      {openInvoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="w-5 h-5" />}
            title="No pending bills"
            body="You're fully paid up. New invoices appear here as soon as the committee issues them."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {openInvoices.map((inv) => (
            <Card key={inv.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className="font-semibold tracking-tight num">{formatINR(inv.total)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {inv.number} · {periodLabel(inv.period)} · due {formatDate(inv.dueOn)}
                  </p>
                </div>
                <PayButton
                  invoice={{
                    id: inv.id,
                    number: inv.number,
                    total: inv.total,
                    unitLabel: membership?.unit.label ?? "",
                    periodLabel: periodLabel(inv.period),
                  }}
                />
              </div>
            </Card>
          ))}
          <p className="text-2xs text-muted-foreground px-1">
            Total outstanding: <span className="font-semibold text-foreground">{formatINR(totalDue)}</span>
          </p>
        </div>
      )}

      {/* Payment history */}
      <SectionTitle>Payment history</SectionTitle>
      {paidInvoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText className="w-5 h-5" />}
            title="No payments yet"
            body="Your receipts will appear here after your first payment."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {paidInvoices.map((inv) => {
            const payment = inv.payments[0];
            return (
              <Card key={inv.id} className="px-5 py-4 flex items-center gap-4">
                <span className="w-9 h-9 rounded-lg bg-[var(--status-green-bg)] text-[var(--status-green)] flex items-center justify-center shrink-0">
                  <ReceiptText className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{periodLabel(inv.period)} maintenance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(inv.paidAt)}
                    {payment && <> · {payment.method} · <span className="font-mono">{payment.providerTxn}</span></>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold num">{formatINR(inv.total)}</p>
                  <p className="text-2xs text-muted-foreground">{payment?.receiptNumber ?? "—"}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transparency */}
      <SectionTitle>Where your community&rsquo;s money goes</SectionTitle>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>This month · community summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Approved aggregate figures — sensitive details stay committee-only.</p>
          </div>
          <Landmark className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Money in</p>
              <p className="text-xl font-semibold num mt-1">{formatINR(monthIncome._sum.amount ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Money out</p>
              <p className="text-xl font-semibold num mt-1">{formatINR(monthExpense._sum.amount ?? 0)}</p>
            </div>
          </div>
          {topExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded yet this month.</p>
          ) : (
            <div className="space-y-2.5">
              {topExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{e.category.charAt(0) + e.category.slice(1).toLowerCase()}</span>
                  <span className="font-medium num">{formatINR(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
