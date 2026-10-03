"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, EyeOff, Trash2, Lock, ShieldCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { moderateReport, togglePinPost, announcePost } from "@/app/actions/admin";
import { resolveEmergency, resolveIncident } from "@/app/actions/admin";

export function ModerationActions({ reportId }: { reportId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast("success", msg);
        router.refresh();
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => moderateReport(reportId, "HIDE"), "Content hidden")}>
        <EyeOff className="w-3.5 h-3.5" /> Hide
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => moderateReport(reportId, "LOCK"), "Comments locked")}>
        <Lock className="w-3.5 h-3.5" /> Lock
      </Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => moderateReport(reportId, "DELETE"), "Content removed")}>
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => moderateReport(reportId, "DISMISS"), "Report dismissed")}>
        Dismiss
      </Button>
    </div>
  );
}

export function PostAdminActions({ postId, pinned }: { postId: string; pinned: boolean }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={pinned ? "Unpin post" : "Pin post"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await togglePinPost(postId, !pinned);
              toast("success", pinned ? "Unpinned" : "Pinned to top");
              router.refresh();
            } catch {
              toast("error", "Action failed");
            }
          })
        }
      >
        {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Notify everyone about this post"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await announcePost(postId);
              toast("success", "Community notified");
              router.refresh();
            } catch {
              toast("error", "Action failed");
            }
          })
        }
      >
        <Megaphone className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function ResolveEmergencyButton({ alertId }: { alertId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await resolveEmergency(alertId);
            toast("success", "Emergency resolved", "The red banner has been cleared.");
            router.refresh();
          } catch {
            toast("error", "Failed");
          }
        })
      }
    >
      <ShieldCheck className="w-4 h-4" /> Resolve
    </Button>
  );
}

export function ResolveIncidentButton({ incidentId }: { incidentId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await resolveIncident(incidentId);
            toast("success", "Incident resolved");
            router.refresh();
          } catch {
            toast("error", "Failed");
          }
        })
      }
    >
      Resolve
    </Button>
  );
}
