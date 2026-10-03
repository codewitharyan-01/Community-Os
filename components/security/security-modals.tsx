"use client";

import { useActionState, useEffect, useState } from "react";
import { Siren, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { createIncident, raiseEmergency } from "@/app/actions/admin";
import { EMERGENCY_TYPES, EMERGENCY_TYPE_LABELS, SEVERITIES, SEVERITY_LABELS } from "@/lib/constants";

type QuickState = { ok?: boolean; error?: string };

export function EmergencyModal() {
  const [open, setOpen] = useModalOpen();
  const [state, action] = useActionState<QuickState, FormData>(raiseEmergency, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Emergency broadcast sent", "All residents have been notified.");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast, setOpen]);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
        <Siren className="w-4 h-4" /> Emergency broadcast
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Raise an emergency" description="This overrides all normal notifications with a red banner across every portal. Use only for real emergencies." size="sm">
        <form action={action} className="space-y-4">
          <Field label="Type">
            <Select name="type" defaultValue="FIRE">
              {EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>)}
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="message" required maxLength={500} placeholder="Fire alarm triggered in Tower B — evacuate via stairs, assembly point is the main garden." className="min-h-[90px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger">Broadcast emergency</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function IncidentModal() {
  const [open, setOpen] = useModalOpen();
  const [state, action] = useActionState<QuickState, FormData>(createIncident, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Incident logged", "Admins and security managers are notified.");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast, setOpen]);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <AlertTriangle className="w-4 h-4" /> Report incident
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a security incident" size="sm">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select name="type" defaultValue="SECURITY">
                {EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>)}
              </Select>
            </Field>
            <Field label="Severity">
              <Select name="severity" defaultValue="MEDIUM">
                {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Title">
            <Input name="title" required maxLength={120} placeholder="Attempted gate tampering at night shift" />
          </Field>
          <Field label="Location">
            <Input name="location" maxLength={120} placeholder="Main gate" />
          </Field>
          <Field label="Description">
            <Textarea name="description" maxLength={1000} placeholder="What happened, actions taken…" className="min-h-[80px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Log incident</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function useModalOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  return [open, setOpen];
}
