"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut, Truck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { checkInByPassCode, checkOutVisitor, walkInVisitor, logDelivery } from "@/app/actions/gate";
import { VehicleLookup } from "@/components/parking/parking-client";
import { IncidentModal, EmergencyModal } from "@/components/security/security-modals";
import { VISITOR_TYPES, VISITOR_TYPE_LABELS } from "@/lib/constants";

export function CheckInPanel() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const res = await checkInByPassCode(code);
      setResult(res);
      if (res.ok) {
        toast("success", res.message ?? "Checked in");
        setCode("");
      }
    });
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold tracking-tight flex items-center gap-2">
        <LogIn className="w-4 h-4" /> Visitor check-in
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">Scan or type the pass code (e.g. VIS-7F3K9A).</p>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VIS-XXXXXX"
          className="font-mono uppercase"
          aria-label="Pass code"
        />
        <Button type="submit" loading={pending}>Verify & check in</Button>
      </form>
      {result && (
        <p className={`mt-3 text-sm flex items-center gap-2 ${result.ok ? "text-[var(--status-green)]" : "text-[var(--status-red)]"}`}>
          {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {result.ok ? result.message : result.error}
        </p>
      )}
    </Card>
  );
}

export function WalkInPanel() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <LogIn className="w-4 h-4" /> Walk-in entry
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Walk-in visitor" size="sm">
        <form
          action={(fd) =>
            startTransition(async () => {
              const res = await walkInVisitor(fd);
              if (res.ok) {
                toast("success", res.message ?? "Logged");
                setOpen(false);
              } else {
                toast("error", res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Name</span>
            <Input name="name" required maxLength={80} placeholder="Ramesh Kumar" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Type</span>
              <Select name="type" defaultValue="GUEST">
                {VISITOR_TYPES.map((t) => <option key={t} value={t}>{VISITOR_TYPE_LABELS[t]}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Vehicle (optional)</span>
              <Input name="vehicleNumber" maxLength={20} placeholder="GJ01AB1234" className="uppercase" />
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Visiting flat (optional)</span>
            <Input name="unitLabel" maxLength={12} placeholder="A-402" className="uppercase" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Log & check in</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeliveryPanel() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Truck className="w-4 h-4" /> Log delivery
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a delivery" size="sm">
        <form
          action={(fd) =>
            startTransition(async () => {
              const res = await logDelivery(fd);
              if (res.ok) {
                toast("success", res.message ?? "Logged");
                setOpen(false);
              } else {
                toast("error", res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Service / person</span>
            <Input name="name" required maxLength={80} placeholder="Amazon · Swiggy · Blue Dart" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Destination flat</span>
            <Input name="unitLabel" required maxLength={12} placeholder="B-204" className="uppercase" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Log delivery</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CheckOutButton({ visitorId, name }: { visitorId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await checkOutVisitor(visitorId);
          if (res.ok) toast("success", `${name} checked out`);
          else toast("error", res.error ?? "Failed");
        })
      }
    >
      <LogOut className="w-3.5 h-3.5" /> Check out
    </Button>
  );
}

export function GateVehicleLookup() {
  return <VehicleLookup />;
}

export function GateEmergencyControls() {
  return (
    <div className="flex gap-2">
      <IncidentModal />
      <EmergencyModal />
    </div>
  );
}

