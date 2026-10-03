"use server";

import { revalidatePath } from "next/cache";
import { requireCommunityUser } from "@/lib/auth";
import { recordInvoicePayment, type PaymentMethod } from "@/lib/payments-core";

export type PayState = {
  step: "idle" | "processing" | "success" | "error";
  error?: string;
  receipt?: { txn: string; amount: number; receiptNumber: string; method: string; invoiceNumber: string };
};

/**
 * Resident mock payment flow — simulated gateway latency, then the shared
 * idempotent payment core. A real gateway adds: create intent → SDK/redirect →
 * signed webhook → verify. The core is deliberately webhook-shaped.
 */
export async function payInvoice(invoiceId: string, method: "UPI" | "CARD" | "NETBANKING"): Promise<PayState> {
  const user = await requireCommunityUser();

  const result = await recordInvoicePayment({
    actor: user,
    invoiceId,
    method: method as PaymentMethod,
    idempotencyKey: `${user.id}:${invoiceId}`,
    source: "RESIDENT_PORTAL",
  });

  if (!result.ok) return { step: "error", error: result.error };

  revalidatePath("/resident");
  revalidatePath("/resident/payments");
  revalidatePath("/admin");

  return {
    step: "success",
    receipt: {
      txn: result.receipt.providerTxn,
      amount: result.receipt.amount,
      receiptNumber: result.receipt.receiptNumber,
      method: result.receipt.method,
      invoiceNumber: result.receipt.invoiceNumber,
    },
  };
}
