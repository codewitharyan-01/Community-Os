"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { inviteVisitor, cancelVisitorPass, type VisitorState } from "@/app/actions/services";
import { VISITOR_TYPES, VISITOR_TYPE_LABELS } from "@/lib/constants";

export function InviteVisitorModal({ autoOpen = false }: { autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [state, action] = useActionState<VisitorState, FormData>(inviteVisitor, {});
  const [pass, setPass] = useState<{ code: string; qr: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok && state.passCode && state.qrDataUrl) {
      setPass({ code: state.passCode, qr: state.qrDataUrl });
      setOpen(false);
      toast("success", "Visitor pass created", `Pass ${state.passCode} shared with gate security.`);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Invite visitor</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite a visitor" description="A QR pass is generated instantly and shared with gate security.">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visitor name" error={state.fieldErrors?.name}>
              <Input name="name" required maxLength={80} placeholder="Priya Sharma" />
            </Field>
            <Field label="Phone (optional)">
              <Input name="phone" maxLength={20} placeholder="98765 43210" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visiting type">
              <Select name="type" defaultValue="GUEST">
                {VISITOR_TYPES.map((t) => <option key={t} value={t}>{VISITOR_TYPE_LABELS[t]}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle number (optional)">
              <Input name="vehicleNumber" maxLength={20} placeholder="GJ01AB1234" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={state.fieldErrors?.date}>
              <Input name="date" type="date" required defaultValue={today} />
            </Field>
            <Field label="Time" error={state.fieldErrors?.time}>
              <Input name="time" type="time" required defaultValue="18:00" />
            </Field>
          </div>
          <Field label="Purpose (optional)">
            <Input name="purpose" maxLength={120} placeholder="Family dinner" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Generate pass</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pass} onClose={() => setPass(null)} title="Visitor pass ready" size="sm">
        {pass && (
          <div className="text-center">
            <div className="mx-auto w-fit bg-white border-2 border-[#0a0a0a] rounded-2xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pass.qr} alt={`QR pass ${pass.code}`} width={180} height={180} />
            </div>
            <p className="mt-4 font-mono text-lg font-semibold tracking-widest">{pass.code}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Share this QR with your visitor. Gate security scans it — or types the code — at check-in.
            </p>
            <Button className="w-full mt-5" onClick={() => setPass(null)}>Done</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

export function VisitorPassActions({ passId, status }: { passId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  if (status !== "EXPECTED") return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await cancelVisitorPass(passId);
            toast("success", "Pass cancelled");
          } catch (err) {
            toast("error", err instanceof Error ? err.message : "Cancel failed");
          }
        })
      }
    >
      Cancel
    </Button>
  );
}
