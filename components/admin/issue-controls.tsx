"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { assignIssue, updateIssueStatus } from "@/app/actions/admin";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AssignIssueDialog({
  issueId,
  staff,
  vendors,
}: {
  issueId: string;
  staff: { id: string; name: string }[];
  vendors: { id: string; company: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserCheck className="w-4 h-4" /> Assign
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign issue" size="sm">
        <div className="space-y-4">
          <Field label="Maintenance staff">
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">— None —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Or vendor">
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">— None —</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.company}</option>)}
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Instructions for the assignee…" className="min-h-[70px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={pending}
              disabled={!staffId && !vendorId}
              onClick={() =>
                startTransition(async () => {
                  const res = await assignIssue(issueId, staffId, vendorId, note);
                  if (res.ok) {
                    toast("success", "Issue assigned", "The assignee and reporter are notified.");
                    setOpen(false);
                  } else {
                    toast("error", res.error ?? "Failed");
                  }
                })
              }
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function IssueStatusSelect({ issueId, current }: { issueId: string; current: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const options = ISSUE_STATUSES.filter((s) => s !== current);

  return (
    <Select
      value=""
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        startTransition(async () => {
          const res = await updateIssueStatus(issueId, next, "");
          if (res.ok) toast("success", `Status → ${ISSUE_STATUS_LABELS[next] ?? next}`);
          else toast("error", res.error ?? "Failed");
        });
      }}
      aria-label="Change issue status"
      className={cn("h-8 text-xs w-36")}
    >
      <option value="">{ISSUE_STATUS_LABELS[current] ?? current} ▾</option>
      {options.map((s) => (
        <option key={s} value={s}>{ISSUE_STATUS_LABELS[s]}</option>
      ))}
    </Select>
  );
}

export function TaskStatusSelect({ taskId, current }: { taskId: string; current: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const options = TASK_STATUSES.filter((s) => s !== current);

  return (
    <Select
      value=""
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        startTransition(async () => {
          try {
            const { updateTaskStatus } = await import("@/app/actions/admin");
            await updateTaskStatus(taskId, next);
            toast("success", `Task → ${TASK_STATUS_LABELS[next] ?? next}`);
          } catch (err) {
            toast("error", err instanceof Error ? err.message : "Failed");
          }
        });
      }}
      aria-label="Change task status"
      className="h-8 text-xs w-36"
    >
      <option value="">{TASK_STATUS_LABELS[current] ?? current} ▾</option>
      {options.map((s) => (
        <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
      ))}
    </Select>
  );
}

export function VerifyIssueButton({ issueId }: { issueId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await updateIssueStatus(issueId, "VERIFIED", "Verified by committee");
          if (res.ok) {
            toast("success", "Issue verified");
            router.refresh();
          } else {
            toast("error", res.error ?? "Failed");
          }
        })
      }
    >
      <CheckCircle2 className="w-4 h-4" /> Verify & close
    </Button>
  );
}

export function FinanceRowActions({
  expenseId,
  status,
  canApprove,
  canManage,
}: {
  expenseId: string;
  status: string;
  canApprove: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function run(fn: () => Promise<unknown>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast("success", okMsg);
        router.refresh();
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  if (status === "PENDING_APPROVAL" && canApprove) {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" disabled={pending} onClick={() => run(() => import("@/app/actions/admin").then((m) => m.approveExpense(expenseId)), "Expense approved")}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => import("@/app/actions/admin").then((m) => m.rejectExpense(expenseId)), "Expense rejected")}>
          Reject
        </Button>
      </div>
    );
  }
  if (status === "APPROVED" && canManage) {
    return (
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => import("@/app/actions/admin").then((m) => m.markExpensePaid(expenseId)), "Marked as paid")}>
        Mark paid
      </Button>
    );
  }
  return null;
}
