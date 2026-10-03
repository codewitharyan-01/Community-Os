"use client";

import { useState } from "react";
import { PayNowModal } from "@/components/payments/pay-now-modal";
import { Button } from "@/components/ui/button";

/** Server-rendered card → client trigger for the mock payment modal. */
export function PayButton({
  invoice,
  size = "md",
  label,
}: {
  invoice: { id: string; number: string; total: number; unitLabel: string; periodLabel: string };
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} size={size}>
        {label ?? "Pay now"}
      </Button>
      <PayNowModal invoice={invoice} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
