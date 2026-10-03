"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, CreditCard, Landmark, Smartphone, ShieldCheck, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";
import { payInvoice, type PayState } from "@/app/actions/payments";

type Method = "UPI" | "CARD" | "NETBANKING";

const METHODS: { id: Method; label: string; hint: string; icon: React.ElementType }[] = [
  { id: "UPI", label: "UPI", hint: "GPay · PhonePe · Paytm", icon: Smartphone },
  { id: "CARD", label: "Card", hint: "Credit / debit", icon: CreditCard },
  { id: "NETBANKING", label: "Net Banking", hint: "All major banks", icon: Landmark },
];

export function PayNowModal({
  invoice,
  open,
  onClose,
}: {
  invoice: { id: string; number: string; total: number; unitLabel: string; periodLabel: string };
  open: boolean;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<Method>("UPI");
  const [state, setState] = useState<PayState>({ step: "idle" });

  async function handlePay() {
    setState({ step: "processing" });
    // Simulated gateway latency for a realistic demo
    await new Promise((r) => setTimeout(r, 1600));
    const res = await payInvoice(invoice.id, method);
    setState(res);
  }

  function close() {
    if (state.step === "processing") return;
    setState({ step: "idle" });
    onClose();
    if (state.step === "success") window.location.reload();
  }

  return (
    <Modal open={open} onClose={close} title={state.step === "success" ? undefined : "Pay maintenance bill"} size="sm">
      <AnimatePresence mode="wait">
        {state.step !== "success" && (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <div className="rounded-xl bg-[var(--subtle)] border border-[var(--border)] p-4 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{invoice.number}</span>
                <span className="font-mono text-xs text-muted-foreground">{invoice.unitLabel}</span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="text-xs text-muted-foreground">{invoice.periodLabel} maintenance</span>
                <span className="text-2xl font-semibold tracking-tight num">{formatINR(invoice.total)}</span>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-2">Payment method</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  disabled={state.step === "processing"}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all disabled:opacity-60",
                    method === m.id
                      ? "border-[#0a0a0a] ring-2 ring-[rgba(10,10,10,0.08)]"
                      : "border-[var(--border-strong)] hover:border-[var(--foreground)]"
                  )}
                  aria-pressed={method === m.id}
                >
                  <m.icon className="w-4 h-4 mb-2" />
                  <span className="block text-[13px] font-medium">{m.label}</span>
                  <span className="block text-2xs text-muted-foreground mt-0.5 leading-tight">{m.hint}</span>
                </button>
              ))}
            </div>

            {state.error && (
              <p className="text-sm text-[var(--status-red)] bg-[var(--status-red-bg)] rounded-lg px-3 py-2.5 mb-4">
                {state.error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" /> Demo gateway — no real money moves
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={close} disabled={state.step === "processing"}>Cancel</Button>
                <Button onClick={handlePay} loading={state.step === "processing"}>
                  {state.step === "processing" ? "Processing…" : `Pay ${formatINR(invoice.total)}`}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {state.step === "success" && state.receipt && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
            >
              <CheckCircle2 className="w-14 h-14 text-[var(--status-green)] mx-auto" />
            </motion.div>
            <h3 className="text-lg font-semibold tracking-tight mt-4">Payment successful</h3>
            <p className="text-3xl font-semibold tracking-tight num mt-2">{formatINR(state.receipt.amount)}</p>
            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-4 text-left space-y-2 text-[13px]">
              <Row label="Invoice" value={state.receipt.invoiceNumber} />
              <Row label="Transaction" value={state.receipt.txn} mono />
              <Row label="Receipt" value={state.receipt.receiptNumber} mono />
              <Row label="Method" value={state.receipt.method} />
            </div>
            <p className="text-2xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <Download className="w-3 h-3" /> A receipt has been emailed to you (see Developer Tools → Email preview)
            </p>
            <Button className="w-full mt-5" onClick={close}>Done</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
