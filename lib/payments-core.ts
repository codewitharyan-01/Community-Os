// Payment core — shared by the resident mock gateway and the admin's
// manual office collection (cash/cheque). Provider-agnostic, idempotent.

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { paymentProvider, sendEmail } from "@/lib/providers";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { formatINR, formatDate } from "@/lib/utils";

export type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "CASH" | "CHEQUE";

export type RecordedPayment = {
  providerTxn: string;
  amount: number;
  receiptNumber: string;
  method: string;
  invoiceNumber: string;
};

export type PaymentResult =
  | { ok: true; receipt: RecordedPayment; replayed: boolean }
  | { ok: false; error: string };

/**
 * Records a payment for an invoice atomically.
 * - Verifies community scope and unit membership (resident paths).
 * - Idempotent: an existing payment with the same idempotency key replays its receipt.
 * - Invoice PENDING/OVERDUE/PARTIAL → PAID + ledger INCOME entry.
 */
export async function recordInvoicePayment(args: {
  actor: SessionUser & { communityId: string };
  invoiceId: string;
  method: PaymentMethod;
  idempotencyKey: string;
  source: "RESIDENT_PORTAL" | "ADMIN_OFFICE";
  providerTxn?: string;
}): Promise<PaymentResult> {
  const { actor, invoiceId, method, idempotencyKey, source } = args;

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { unit: true } });
  if (!invoice || invoice.communityId !== actor.communityId) {
    return { ok: false, error: "Invoice not found." };
  }
  if (invoice.status === "PAID") return { ok: false, error: "This invoice is already paid." };
  if (invoice.status === "VOIDED") return { ok: false, error: "This invoice was voided by the committee." };

  if (source === "RESIDENT_PORTAL") {
    const member = await db.membership.findFirst({ where: { userId: actor.id, unitId: invoice.unitId } });
    if (!member) return { ok: false, error: "You can only pay invoices for your own unit." };
  }

  const existing = await db.payment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return {
      ok: true,
      replayed: true,
      receipt: {
        providerTxn: existing.providerTxn,
        amount: existing.amount,
        receiptNumber: existing.receiptNumber,
        method: existing.method,
        invoiceNumber: invoice.number,
      },
    };
  }

  const intent = args.providerTxn
    ? { providerTxn: args.providerTxn }
    : await paymentProvider.createIntent({ invoiceNumber: invoice.number, amount: invoice.total, idempotencyKey });

  const receiptNumber = `RCP-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    await db.$transaction([
      db.payment.create({
        data: {
          communityId: actor.communityId,
          invoiceId: invoice.id,
          userId: actor.id,
          amount: invoice.total,
          method,
          providerTxn: intent.providerTxn,
          idempotencyKey,
          status: "SUCCESS",
          receiptNumber,
        },
      }),
      db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } }),
      db.ledgerEntry.create({
        data: {
          communityId: actor.communityId,
          date: new Date(),
          type: "INCOME",
          category: "MAINTENANCE",
          description: `Payment for ${invoice.number} (${invoice.unit.label})${source === "ADMIN_OFFICE" ? " · office collection" : ""}`,
          amount: invoice.total,
          refType: "PAYMENT",
          refId: invoice.id,
        },
      }),
    ]);
  } catch {
    return { ok: false, error: "Payment could not be recorded. No money was moved — please retry." };
  }

  // Side effects (best effort, outside the transaction)
  const payer = await db.user.findUnique({ where: { id: actor.id }, select: { name: true, email: true } });
  const unitMembers = await db.membership.findMany({ where: { unitId: invoice.unitId }, select: { userId: true } });

  await Promise.all([
    payer
      ? sendEmail({
          to: payer.email,
          communityId: actor.communityId,
          template: "payment_receipt",
          subject: `Payment received — ${formatINR(invoice.total)} (${invoice.number})`,
          body:
            `Dear ${payer.name},\n\nWe've received your payment of ${formatINR(invoice.total)} for invoice ${invoice.number} (${invoice.unit.label}).\n\n` +
            `Transaction: ${intent.providerTxn}\nReceipt: ${receiptNumber}\nMethod: ${method}\nDate: ${formatDate(new Date())}\n\nThank you.\n— Community OS`,
        })
      : Promise.resolve(),
    notify({
      userIds: unitMembers.map((m) => m.userId),
      communityId: actor.communityId,
      type: "PAYMENT",
      title: `Payment successful — ${formatINR(invoice.total)}`,
      body: `${invoice.number} marked as paid. Receipt ${receiptNumber}.`,
      link: "/resident/payments",
    }),
  ]);

  await logAudit({
    actor,
    communityId: actor.communityId,
    action: "PAYMENT_RECORDED",
    entity: "Invoice",
    entityId: invoice.id,
    summary: `${actor.name} recorded ${formatINR(invoice.total)} for ${invoice.number} (${method}${source === "ADMIN_OFFICE" ? ", office" : ""})`,
    before: { status: invoice.status },
    after: { status: "PAID" },
  });

  return {
    ok: true,
    replayed: false,
    receipt: {
      providerTxn: intent.providerTxn,
      amount: invoice.total,
      receiptNumber,
      method,
      invoiceNumber: invoice.number,
    },
  };
}
