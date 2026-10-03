"use client";

import { useActionState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { createPoll, type PollState, createEvent, type EventState } from "@/app/actions/community";
import { useState } from "react";

export function NewPollModal() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<PollState, FormData>(createPoll, {});
  const [optionCount, setOptionCount] = useState(3);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Poll created", "Residents have been notified.");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New poll</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a poll" description="Polls are one-vote-per-resident. Official polls are marked as governance votes.">
        <form action={action} className="space-y-4">
          <Field label="Question" error={state.fieldErrors?.question}>
            <Input name="question" required maxLength={200} placeholder="Should we install EV chargers in the basement?" />
          </Field>
          <Field label="Description (optional)">
            <Textarea name="description" maxLength={1000} placeholder="Context, cost estimates, proposal details…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select name="kind" defaultValue="INFORMAL">
                <option value="INFORMAL">Informal poll</option>
                <option value="OFFICIAL">Official governance vote</option>
              </Select>
            </Field>
            <Field label="Open for">
              <Select name="days" defaultValue="7">
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </Select>
            </Field>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Options</p>
            <div className="space-y-2">
              {Array.from({ length: optionCount }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Input name="option" required={i < 2} maxLength={80} placeholder={`Option ${i + 1}`} />
                  {optionCount > 2 && i >= 2 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOptionCount((c) => c - 1)} aria-label="Remove option">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {optionCount < 6 && (
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setOptionCount((c) => c + 1)}>
                <Plus className="w-3.5 h-3.5" /> Add option
              </Button>
            )}
            {state.fieldErrors?.options && <p className="text-2xs text-[var(--status-red)] mt-1">{state.fieldErrors.options}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create poll</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function NewEventModal() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<EventState, FormData>(createEvent, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Event created", "Residents have been notified.");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New event</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create an event" description="Residents can RSVP and volunteer once published.">
        <form action={action} className="space-y-4">
          <Field label="Title" error={state.fieldErrors?.title}>
            <Input name="title" required maxLength={120} placeholder="Diwali Celebration 2026" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select name="type" defaultValue="EVENT">
                <option value="EVENT">Community event</option>
                <option value="FESTIVAL">Festival</option>
                <option value="MEETING">Meeting / AGM</option>
                <option value="MAINTENANCE">Maintenance window</option>
              </Select>
            </Field>
            <Field label="Location">
              <Input name="location" maxLength={120} placeholder="Clubhouse" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={state.fieldErrors?.date}>
              <Input name="date" type="date" required />
            </Field>
            <Field label="Time" error={state.fieldErrors?.time}>
              <Input name="time" type="time" required defaultValue="18:00" />
            </Field>
          </div>
          <Field label="Description (optional)">
            <Textarea name="description" maxLength={2000} placeholder="Schedule, arrangements, notes…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget (₹)">
              <Input name="budget" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Volunteer slots">
              <Input name="volunteerSlots" type="number" min={0} defaultValue={0} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create event</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
