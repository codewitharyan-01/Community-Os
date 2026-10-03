"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Search, BellRing, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { lookupVehicle, notifyVehicleOwner, addVehicle, removeVehicle, type VehicleState } from "@/app/actions/services";

type LookupResult = {
  number: string;
  model: string;
  color: string;
  type: string;
  unitLabel: string;
  slots: string[];
  ownerMasked: string;
  vehicleId: string;
};

type LookupState = { result: LookupResult | null; error: string | null };

export function VehicleLookup() {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupVehicle, { result: null, error: null });
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [sendPending, startSend] = useTransition();
  const { toast } = useToast();

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold tracking-tight">Vehicle lookup</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
        Privacy-first: you&rsquo;ll see the flat and a masked owner name — never a phone number. Lookups are audit-logged.
      </p>
      <form action={action} className="flex gap-2">
        <Input name="number" placeholder="e.g. GJ01AB1234" className="uppercase font-mono" maxLength={15} required aria-label="Vehicle number" />
        <Button type="submit" loading={pending}><Search className="w-4 h-4" /> Search</Button>
      </form>

      {state.error && <p className="text-sm text-[var(--status-red)] mt-3">{state.error}</p>}

      {state.result && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--subtle)] p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-sm font-semibold">{state.result.number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {state.result.model || state.result.type.toLowerCase()} · Flat {state.result.unitLabel}
                {state.result.slots.length > 0 && ` · Slot ${state.result.slots.join(", ")}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs text-muted-foreground">Owner</p>
              <p className="text-sm font-medium">{state.result.ownerMasked}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => { setNotifyOpen(true); setSent(false); }}
          >
            <BellRing className="w-4 h-4" /> Notify owner
          </Button>
        </div>
      )}

      <Modal open={notifyOpen} onClose={() => setNotifyOpen(false)} title={`Notify owner of ${state.result?.number ?? ""}`} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startSend(async () => {
              try {
                await notifyVehicleOwner(state.result!.vehicleId, note);
                setSent(true);
                setNote("");
                toast("success", "Owner notified", "They'll see your request in their notifications.");
                setTimeout(() => setNotifyOpen(false), 1200);
              } catch {
                toast("error", "Could not send notification");
              }
            });
          }}
          className="space-y-3"
        >
          <Field label="Message (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hi, your car is blocking mine — could you move it?" maxLength={200} />
          </Field>
          <p className="text-2xs text-muted-foreground">Your name is shared; your phone number is not.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={sendPending} disabled={sent}>
              {sent ? "Sent ✓" : "Send notification"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

export function AddVehicleModal() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<VehicleState, FormData>(addVehicle, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Vehicle added");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add vehicle</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Register a vehicle" size="sm">
        <form action={action} className="space-y-4">
          <Field label="Registration number" error={state.fieldErrors?.number}>
            <Input name="number" required maxLength={15} placeholder="GJ01XY5678" className="uppercase" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select name="type" defaultValue="CAR">
                <option value="CAR">Car</option>
                <option value="BIKE">Bike</option>
                <option value="SCOOTER">Scooter</option>
                <option value="EV">EV</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Color (optional)">
              <Input name="color" maxLength={30} placeholder="White" />
            </Field>
          </div>
          <Field label="Model (optional)">
            <Input name="model" maxLength={60} placeholder="Hyundai i20" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Add</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function RemoveVehicleButton({ vehicleId }: { vehicleId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Remove vehicle"
      loading={pending}
      onClick={() => startTransition(async () => {
        try {
          await removeVehicle(vehicleId);
          toast("success", "Vehicle removed");
        } catch {
          toast("error", "Remove failed");
        }
      })}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  );
}
