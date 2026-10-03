"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { createTask } from "@/app/actions/admin";

/** One-click: generate a service task from an asset's PM schedule. */
export function GenerateServiceTaskButton({ assetId, assetName }: { assetId: string; assetName: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      aria-label={`Create service task for ${assetName}`}
      onClick={() => {
        const fd = new FormData();
        fd.set("title", `Service: ${assetName}`);
        fd.set("priority", "MEDIUM");
        fd.set("assetId", assetId);
        fd.set("description", "Auto-generated from the preventive maintenance schedule.");
        startTransition(async () => {
          try {
            await createTask({} as never, fd);
            toast("success", "Service task created", "Assign staff from Issues & Tasks → Maintenance tasks.");
            router.refresh();
          } catch (err) {
            toast("error", err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <Wrench className="w-3.5 h-3.5" /> Service task
    </Button>
  );
}

/** Runs the preventive maintenance check across all assets (deterministic, client-triggered). */
export function RunPMCheckButton() {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const res = await fetch("/api/preventive-maintenance", { method: "POST" });
              const data = (await res.json()) as { created: number; assets: string[]; error?: string };
              if (data.error) {
                toast("error", data.error);
                return;
              }
              setSummary(data.created > 0 ? `${data.created} task(s) generated for: ${data.assets.join(", ")}` : "All assets are on schedule — no tasks needed.");
              toast(data.created > 0 ? "success" : "info", data.created > 0 ? `${data.created} preventive task(s) generated` : "Everything on schedule");
              router.refresh();
            } catch {
              toast("error", "PM check failed");
            }
          })
        }
      >
        <RefreshCw className="w-4 h-4" /> Run preventive maintenance check
      </Button>
      {summary && <p className="text-xs text-muted-foreground mt-2">{summary}</p>}
    </>
  );
}

