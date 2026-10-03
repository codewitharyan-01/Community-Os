"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CalendarCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { bookFacility, cancelBooking, type BookingState } from "@/app/actions/services";
import { formatINR } from "@/lib/utils";

export type FacilityDTO = {
  id: string;
  name: string;
  description: string;
  hourlyFee: number;
  openHour: number;
  closeHour: number;
  approvalRequired: boolean;
  maxPerMonth: number;
};

export function FacilityCard({ facility }: { facility: FacilityDTO }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<BookingState, FormData>(bookFacility, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok && state.message) {
      toast("success", "Booking submitted", state.message);
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight">{facility.name}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs">{facility.description}</p>
          </div>
          <p className="text-sm font-semibold num shrink-0">
            {facility.hourlyFee === 0 ? "Free" : `${formatINR(facility.hourlyFee)}/hr`}
          </p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-2xs text-muted-foreground">
            {facility.openHour}:00–{facility.closeHour}:00 · max {facility.maxPerMonth}/month{facility.approvalRequired ? " · approval required" : ""}
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>Book</Button>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={`Book ${facility.name}`} size="sm">
        <form action={action} className="space-y-4">
          <input type="hidden" name="facilityId" value={facility.id} />
          <Field label="Date">
            <Input name="date" type="date" required defaultValue={today} min={today} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts at">
              <Select name="startHour" defaultValue={String(facility.openHour)}>
                {Array.from({ length: facility.closeHour - facility.openHour }).map((_, i) => {
                  const h = facility.openHour + i;
                  return <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>;
                })}
              </Select>
            </Field>
            <Field label="Duration">
              <Select name="hours" defaultValue="1">
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </Select>
            </Field>
          </div>
          {facility.hourlyFee > 0 && (
            <p className="text-2xs text-muted-foreground">Facility fees, if any, are settled with the committee as per society policy.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm"><CalendarCheck className="w-4 h-4" /> Check availability & book</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => startTransition(async () => {
        try {
          await cancelBooking(bookingId);
          toast("success", "Booking cancelled");
        } catch {
          toast("error", "Cancel failed");
        }
      })}
    >
      <X className="w-3.5 h-3.5" /> Cancel
    </Button>
  );
}
