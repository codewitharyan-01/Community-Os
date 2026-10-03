"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, RefreshCw, Upload, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import {
  createBillingRun, createExpense, addResident, uploadDocument, createTask,
  type BillingState, type ExpenseState, type ResidentState, type DocumentState, type TaskState,
} from "@/app/actions/admin";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, SEVERITIES, SEVERITY_LABELS } from "@/lib/constants";

function useModalToast<T extends { ok?: boolean; error?: string; message?: string; tempPassword?: string }>(
  state: T,
  successMsg: string,
  onClose: () => void,
  onExtra?: (s: T) => void
) {
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) {
      toast("success", successMsg, state.message ?? (state.tempPassword ? `Temporary password: ${state.tempPassword}` : undefined));
      onExtra?.(state);
      onClose();
    } else if (state.error) {
      toast("error", state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

// ─── Billing run ──────────────────────────────────────────────────────────────

export function BillingRunModal({ buildings }: { buildings: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<BillingState, FormData>(createBillingRun, {});
  useModalToast(state, "Billing run posted", () => setOpen(false));

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New billing run</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create billing run" description="Generate invoices for all occupied units in scope, notify residents, and post to the ledger." size="lg">
        <form action={action} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Billing period">
              <Input name="period" type="month" defaultValue={defaultPeriod} required />
            </Field>
            <Field label="Due day">
              <Select name="dueDay" defaultValue="10">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Scope">
              <Select name="buildingId" defaultValue="">
                <option value="">All buildings</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Charge rules (₹ per unit)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Maintenance"><Input name="maintenance" type="number" min={0} defaultValue={2500} required /></Field>
              <Field label="Parking"><Input name="parking" type="number" min={0} defaultValue={0} /></Field>
              <Field label="Water"><Input name="water" type="number" min={0} defaultValue={0} /></Field>
              <Field label="Sinking fund"><Input name="sinkingFund" type="number" min={0} defaultValue={0} /></Field>
              <Field label="Repair fund"><Input name="repairFund" type="number" min={0} defaultValue={0} /></Field>
            </div>
          </div>
          <p className="text-2xs text-muted-foreground leading-relaxed">
            Units that already have an invoice for this period are skipped. Residents receive an in-app notification and a mock email.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Calculate & post invoices</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export function ExpenseModal({ vendors }: { vendors: { id: string; company: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ExpenseState, FormData>(createExpense, {});
  useModalToast(state, "Expense submitted for approval", () => setOpen(false));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add expense</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record an expense" size="sm">
        <form action={action} className="space-y-4">
          <Field label="Vendor (optional)">
            <Select name="vendorId" defaultValue="">
              <option value="">— No vendor / one-time —</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.company}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category" defaultValue="REPAIRS">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
            <Field label="Amount (₹)" error={state.fieldErrors?.amount}>
              <Input name="amount" type="number" min={1} required />
            </Field>
          </div>
          <Field label="Date">
            <Input name="date" type="date" defaultValue={today} required />
          </Field>
          <Field label="Description" error={state.fieldErrors?.description}>
            <Input name="description" required maxLength={300} placeholder="Lift AMC quarterly payment" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Submit</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Add resident ─────────────────────────────────────────────────────────────

export function AddResidentModal({ units }: { units: { id: string; label: string; building: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ResidentState, FormData>(addResident, {});
  const [tempPw, setTempPw] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      if (state.tempPassword) setTempPw(state.tempPassword);
      else toast("success", "Resident added");
      setOpen(false);
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add resident</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a resident" description="Creates the account, links the unit, and sends a welcome email (mock outbox).">
        <form action={action} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" error={state.fieldErrors?.name}>
              <Input name="name" required maxLength={80} placeholder="Kavita Desai" />
            </Field>
            <Field label="Email" error={state.fieldErrors?.email}>
              <Input name="email" type="email" required placeholder="kavita@example.com" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Phone">
              <Input name="phone" maxLength={20} placeholder="98765 43210" />
            </Field>
            <Field label="Residence role">
              <Select name="role" defaultValue="OWNER">
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
                <option value="FAMILY_MEMBER">Family member</option>
              </Select>
            </Field>
            <Field label="Unit" error={state.fieldErrors?.unitId}>
              <Select name="unitId" required defaultValue="">
                <option value="" disabled>Select unit</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.building}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Password (optional)" hint="Leave blank to auto-generate a temporary password" error={state.fieldErrors?.password}>
            <Input name="password" type="text" minLength={8} maxLength={64} placeholder="min 8 characters" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add resident</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!tempPw} onClose={() => setTempPw(null)} title="Resident created" size="sm">
        <p className="text-sm">Share this temporary password with the resident:</p>
        <p className="mt-3 font-mono text-lg font-semibold bg-[var(--muted)] rounded-lg px-3 py-2.5 text-center">{tempPw}</p>
        <p className="text-2xs text-muted-foreground mt-3">A welcome email with these credentials is in Developer Tools → Email preview.</p>
        <Button className="w-full mt-4" onClick={() => setTempPw(null)}>Done</Button>
      </Modal>
    </>
  );
}

// ─── Upload document ──────────────────────────────────────────────────────────

export function UploadDocumentModal() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<DocumentState, FormData>(uploadDocument, {});
  useModalToast(state, "Document uploaded", () => setOpen(false));

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Upload className="w-4 h-4" /> Upload document</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload a document" size="sm">
        <form action={action} className="space-y-4">
          <Field label="Title">
            <Input name="title" required maxLength={120} placeholder="Fire safety audit 2026" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category" defaultValue="POLICIES">
                {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
            <Field label="Visibility">
              <Select name="visibility" defaultValue="RESIDENT">
                <option value="RESIDENT">All residents</option>
                <option value="COMMITTEE">Committee only</option>
                <option value="ADMIN">Admins only</option>
              </Select>
            </Field>
          </div>
          <Field label="File" hint="JPG, PNG, WEBP or PDF up to 8MB">
            <input
              type="file"
              name="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="w-full text-sm text-muted-foreground file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--muted)] file:text-foreground file:text-sm file:font-medium hover:file:bg-[#ececea] file:cursor-pointer"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Upload</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Create task ──────────────────────────────────────────────────────────────

export function TaskModal({
  staff,
  vendors,
  assets,
}: {
  staff: { id: string; name: string }[];
  vendors: { id: string; company: string }[];
  assets: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaskState, FormData>(createTask, {});
  useModalToast(state, "Task created", () => setOpen(false));

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><ClipboardList className="w-4 h-4" /> New task</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create maintenance task">
        <form action={action} className="space-y-4">
          <Field label="Title" error={state.fieldErrors?.title}>
            <Input name="title" required maxLength={120} placeholder="Service pump in Tower B" />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Priority">
              <Select name="priority" defaultValue="MEDIUM">
                {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Due date">
              <Input name="dueDate" type="date" />
            </Field>
            <Field label="Location">
              <Input name="location" maxLength={120} placeholder="Terrace, Tower B" />
            </Field>
          </div>
          <Field label="Assign to staff">
            <Select name="assignedToUserId" defaultValue="">
              <option value="">— Unassigned —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Or assign to vendor">
              <Select name="assignedVendorId" defaultValue="">
                <option value="">— None —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.company}</option>)}
              </Select>
            </Field>
            <Field label="Related asset">
              <Select name="assetId" defaultValue="">
                <option value="">— None —</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="description" maxLength={1000} placeholder="Details for the assignee…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create task</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Developer: reset demo ────────────────────────────────────────────────────

export function ResetDemoButton() {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  if (!confirming) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        <RefreshCw className="w-4 h-4" /> Reset demo database
      </Button>
    );
  }
  return (
    <Card className="p-4 border-[var(--status-orange)] bg-[var(--status-orange-bg)]">
      <p className="text-sm font-medium">Reset ALL demo data?</p>
      <p className="text-xs mt-1">Every record returns to the original seed. You&rsquo;ll be signed out.</p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Keep data</Button>
        <Button
          size="sm"
          variant="danger"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const { resetDemoAction } = await import("@/app/actions/dev");
              try {
                await resetDemoAction();
              } catch (e) {
                toast("error", e instanceof Error ? e.message : "Reset failed");
              }
            })
          }
        >
          Yes, reset everything
        </Button>
      </div>
    </Card>
  );
}
