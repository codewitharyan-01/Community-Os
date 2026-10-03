"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { voidInvoice } from "@/app/actions/admin";

export function VoidButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label="Void invoice"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Void this invoice? Residents will no longer see it as due.")) return;
        startTransition(async () => {
          try {
            await voidInvoice(invoiceId);
            toast("success", "Invoice voided");
            router.refresh();
          } catch (err) {
            toast("error", err instanceof Error ? err.message : "Void failed");
          }
        });
      }}
    >
      <Ban className="w-3.5 h-3.5" />
    </Button>
  );
}
