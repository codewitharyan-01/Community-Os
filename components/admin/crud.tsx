"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Pencil, Trash2, UserRound, Send, BellRing, Wrench, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  updateResident, setUserActive, deleteResident, addTeamMember, updateTeamMember,
  addBuildingWithUnits, upsertFacility, toggleFacility, upsertVendor,
  deleteDocument, setDocumentVisibility, updateEvent, setEventCancelled, deletePoll,
  adminUpdatePost, adminDeletePost, updateTaskDetails, deleteTask, upsertAsset,
  markAssetServiced, saveBillingConfig, setRoleEnabled, broadcastNotification,
  sendPaymentReminders, recordManualPayment,
} from "@/app/actions/manage";
import type { ActionResult } from "@/app/actions/manage";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function useRun() {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const run = useCallback(
    (fn: () => Promise<ActionResult>, okMsg?: string, onSuccess?: (res: ActionResult) => void) => {
      startTransition(async () => {
        try {
          const res = await fn();
          if (res.ok) {
            toast("success", okMsg ?? res.message ?? "Done");
            router.refresh();
            onSuccess?.(res);
          } else {
            toast("error", res.error ?? "Action failed");
          }
        } catch (err) {
          toast("error", err instanceof Error ? err.message : "Action failed");
        }
      });
    },
    [toast, router]
  );
  return { pending, run };
}

// ─── Residents ────────────────────────────────────────────────────────────────

export function ResidentRowActions({
  user,
}: {
  user: { id: string; name: string; phone: string; membershipType: string; active: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, run } = useRun();

  return (
    <div className="flex justify-end">
      <DropdownMenu
        items={(close) => (
          <>
            <MenuItem icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { close(); setOpen(true); }}>
              Edit resident
            </MenuItem>
            <MenuItem
              icon={<UserRound className="w-3.5 h-3.5" />}
              onClick={() => { close(); run(() => setUserActive(user.id, !user.active), user.active ? "Deactivated" : "Reactivated"); }}
            >
              {user.active ? "Deactivate account" : "Reactivate account"}
            </MenuItem>
            {confirmDelete ? (
              <MenuItem
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => { close(); run(() => deleteResident(user.id), "Resident removed"); }}
              >
                Confirm delete?
              </MenuItem>
            ) : (
              <MenuItem danger icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete…
              </MenuItem>
            )}
          </>
        )}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${user.name}`} size="sm">
        <form
          action={(fd) => { run(() => updateResident(fd), "Resident updated"); setOpen(false); }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={user.id} />
          <Field label="Full name">
            <Input name="name" defaultValue={user.name} required maxLength={80} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input name="phone" defaultValue={user.phone} maxLength={20} />
            </Field>
            <Field label="Residence type">
              <Select name="membershipType" defaultValue={user.membershipType}>
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
                <option value="FAMILY_MEMBER">Family member</option>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Team (settings) ──────────────────────────────────────────────────────────

export function AddTeamMemberModal() {
  const [open, setOpen] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const { run } = useRun();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add team member</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a team member" description="Creates an account with portal access for the chosen role.">
        <form
          action={(fd) => {
            run(() => addTeamMember(fd), undefined, (res) => {
              if (res.tempPassword) setTempPw(res.tempPassword);
              setOpen(false);
            });
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <Input name="name" required maxLength={80} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <Input name="phone" maxLength={20} />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="COMMITTEE_MEMBER">
                <option value="COMMITTEE_MEMBER">Committee Member</option>
                <option value="SECRETARY">Secretary</option>
                <option value="TREASURER">Treasurer</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="FACILITY_MANAGER">Facility Manager</option>
                <option value="SECURITY_MANAGER">Security Manager</option>
                <option value="SECURITY_GUARD">Security Guard</option>
                <option value="MAINTENANCE_STAFF">Maintenance Staff</option>
              </Select>
            </Field>
          </div>
          <Field label="Password (optional)" hint="Leave blank to auto-generate a temporary password">
            <Input name="password" minLength={8} placeholder="min 8 characters" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Add member</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!tempPw} onClose={() => setTempPw(null)} title="Team member created" size="sm">
        <p className="text-sm">Temporary password:</p>
        <p className="mt-3 font-mono text-lg font-semibold bg-[var(--muted)] rounded-lg px-3 py-2.5 text-center">{tempPw}</p>
        <Button className="w-full mt-4" onClick={() => setTempPw(null)}>Done</Button>
      </Modal>
    </>
  );
}

export function TeamMemberRowActions({
  member,
  roles,
}: {
  member: { id: string; name: string; role: string; active: boolean };
  roles: { value: string; label: string }[];
}) {
  const { pending, run } = useRun();
  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        value={member.role}
        disabled={pending}
        className="h-8 text-xs w-40"
        aria-label={`Role for ${member.name}`}
        onChange={(e) => run(() => updateTeamMember(member.id, e.target.value, member.active), "Role updated")}
      >
        {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </Select>
      <Button
        size="sm"
        variant={member.active ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => run(() => updateTeamMember(member.id, member.role, !member.active), member.active ? "Deactivated" : "Activated")}
      >
        {member.active ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}

// ─── Buildings ────────────────────────────────────────────────────────────────

export function AddBuildingModal() {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add building</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a building" size="sm">
        <form action={(fd) => { run(() => addBuildingWithUnits(fd)); setOpen(false); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Building name">
              <Input name="name" required maxLength={60} placeholder="Tower D" />
            </Field>
            <Field label="Code" hint="Used in flat labels, e.g. D-101">
              <Input name="code" required maxLength={4} placeholder="D" className="uppercase" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Floors">
              <Input name="floors" type="number" min={1} max={60} defaultValue={10} required />
            </Field>
            <Field label="Units per floor">
              <Input name="perFloor" type="number" min={1} max={30} defaultValue={4} required />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Facilities ───────────────────────────────────────────────────────────────

export function FacilityModal({ facility }: { facility?: { id: string; name: string; description: string; hourlyFee: number; openHour: number; closeHour: number; maxPerMonth: number; approvalRequired: boolean } }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" variant={facility ? "ghost" : "primary"} onClick={() => setOpen(true)}>
        {facility ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
        {facility ? undefined : "Add facility"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={facility ? `Edit ${facility.name}` : "Add a facility"} size="sm">
        <form action={(fd) => { run(() => upsertFacility(fd)); setOpen(false); }} className="space-y-4">
          {facility && <input type="hidden" name="id" value={facility.id} />}
          <Field label="Name">
            <Input name="name" required defaultValue={facility?.name} maxLength={80} />
          </Field>
          <Field label="Description">
            <Textarea name="description" defaultValue={facility?.description} maxLength={300} className="min-h-[64px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hourly fee (₹)">
              <Input name="hourlyFee" type="number" min={0} defaultValue={facility?.hourlyFee ?? 0} />
            </Field>
            <Field label="Max bookings / month">
              <Input name="maxPerMonth" type="number" min={1} defaultValue={facility?.maxPerMonth ?? 4} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <Field label="Opens">
              <Input name="openHour" type="number" min={0} max={23} defaultValue={facility?.openHour ?? 6} />
            </Field>
            <Field label="Closes">
              <Input name="closeHour" type="number" min={1} max={24} defaultValue={facility?.closeHour ?? 22} />
            </Field>
            <label className="flex items-center gap-2 text-sm h-10">
              <input type="checkbox" name="approvalRequired" defaultChecked={facility?.approvalRequired} className="w-4 h-4" />
              Approval
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>{facility ? "Save" : "Add facility"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function FacilityToggle({ id, active }: { id: string; active: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => toggleFacility(id, !active), active ? "Facility disabled" : "Facility enabled")}>
      {active ? "Disable" : "Enable"}
    </Button>
  );
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export function VendorModal({ vendor }: { vendor?: { id: string; company: string; category: string; contactName: string; phone: string; email: string; monthlyAmount: number; contractEnd: string | null } }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" variant={vendor ? "ghost" : "primary"} onClick={() => setOpen(true)}>
        {vendor ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
        {vendor ? undefined : "Add vendor"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={vendor ? `Edit ${vendor.company}` : "Add a vendor"} size="sm">
        <form action={(fd) => { run(() => upsertVendor(fd)); setOpen(false); }} className="space-y-4">
          {vendor && <input type="hidden" name="id" value={vendor.id} />}
          <Field label="Company">
            <Input name="company" required defaultValue={vendor?.company} maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category" defaultValue={vendor?.category ?? "SECURITY"}>
                {["SECURITY", "CLEANING", "LIFT", "ELECTRICAL", "PLUMBING", "GARDEN", "PEST_CONTROL", "FIRE_SAFETY", "WATER", "OTHER"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly amount (₹)">
              <Input name="monthlyAmount" type="number" min={0} defaultValue={vendor?.monthlyAmount ?? 0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person">
              <Input name="contactName" defaultValue={vendor?.contactName} maxLength={80} />
            </Field>
            <Field label="Phone">
              <Input name="phone" defaultValue={vendor?.phone} maxLength={20} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input name="email" type="email" defaultValue={vendor?.email} />
            </Field>
            <Field label="Contract ends">
              <Input name="contractEnd" type="date" defaultValue={vendor?.contractEnd ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>{vendor ? "Save" : "Add vendor"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export function AssetModal() {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Add asset</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add an asset" size="sm">
        <form action={(fd) => { run(() => upsertAsset(fd)); setOpen(false); }} className="space-y-4">
          <Field label="Name">
            <Input name="name" required maxLength={120} placeholder="Borewell Pump 3" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select name="category" defaultValue="PUMP">
                {["LIFT", "PUMP", "GENERATOR", "CCTV", "FIRE_SAFETY", "SOLAR", "WATER_TANK", "GYM", "EV_CHARGER", "OTHER"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Condition">
              <Select name="condition" defaultValue="GOOD">
                {["EXCELLENT", "GOOD", "FAIR", "POOR"].map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <Input name="location" maxLength={120} placeholder="Basement 1" />
            </Field>
            <Field label="Service interval (days)" hint="0 = no schedule">
              <Input name="intervalDays" type="number" min={0} max={730} defaultValue={90} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Add asset</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function MarkServicedButton({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant="ghost" disabled={pending} aria-label={`Mark ${assetName} serviced`} onClick={() => run(() => markAssetServiced(assetId), "Service logged")}>
      <Wrench className="w-3.5 h-3.5" /> Serviced
    </Button>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function TaskRowActions({
  task,
  staff,
}: {
  task: { id: string; title: string; priority: string; dueDate: string | null; assignedToUserId: string | null };
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" aria-label={`Edit ${task.title}`} onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Delete ${task.title}`}
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${task.title}"?`)) run(() => deleteTask(task.id), "Task deleted");
        }}
      >
        <Trash2 className="w-3.5 h-3.5 text-[var(--status-red)]" />
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Edit task`} size="sm">
        <form action={(fd) => { run(() => updateTaskDetails(fd)); setOpen(false); }} className="space-y-4">
          <input type="hidden" name="id" value={task.id} />
          <Field label="Title">
            <Input name="title" required defaultValue={task.title} maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select name="priority" defaultValue={task.priority}>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
              </Select>
            </Field>
            <Field label="Due date">
              <Input name="dueDate" type="date" defaultValue={task.dueDate ?? ""} />
            </Field>
          </div>
          <Field label="Assigned staff">
            <Select name="assignedToUserId" defaultValue={task.assignedToUserId ?? ""}>
              <option value="">— Unassigned —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function DocumentRowActions({ doc }: { doc: { id: string; title: string; visibility: string } }) {
  const { pending, run } = useRun();
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Select
        value={doc.visibility}
        disabled={pending}
        className="h-8 text-xs w-32"
        aria-label={`Visibility for ${doc.title}`}
        onChange={(e) => run(() => setDocumentVisibility(doc.id, e.target.value), "Visibility updated")}
      >
        <option value="RESIDENT">Residents</option>
        <option value="COMMITTEE">Committee</option>
        <option value="ADMIN">Admins</option>
      </Select>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Delete ${doc.title}`}
        disabled={pending}
        onClick={() => { if (window.confirm(`Delete "${doc.title}"?`)) run(() => deleteDocument(doc.id), "Document deleted"); }}
      >
        <Trash2 className="w-3.5 h-3.5 text-[var(--status-red)]" />
      </Button>
    </div>
  );
}

// ─── Events & polls & posts (admin community) ─────────────────────────────────

export function EventRowActions({ event }: { event: { id: string; title: string; location: string; description: string; date: string; time: string; cancelled: boolean } }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <div className="flex items-center gap-1 shrink-0">
      {!event.cancelled && (
        <Button size="sm" variant="ghost" aria-label={`Edit ${event.title}`} onClick={() => setOpen(true)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button
        size="sm"
        variant={event.cancelled ? "secondary" : "ghost"}
        disabled={pending}
        onClick={() => run(() => setEventCancelled(event.id, !event.cancelled), event.cancelled ? "Event restored" : "Event cancelled")}
      >
        {event.cancelled ? "Restore" : <><Ban className="w-3.5 h-3.5" /> Cancel</>}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit event" size="sm">
        <form action={(fd) => { run(() => updateEvent(fd)); setOpen(false); }} className="space-y-4">
          <input type="hidden" name="id" value={event.id} />
          <Field label="Title">
            <Input name="title" required defaultValue={event.title} maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input name="date" type="date" required defaultValue={event.date} />
            </Field>
            <Field label="Time">
              <Input name="time" type="time" required defaultValue={event.time} />
            </Field>
          </div>
          <Field label="Location">
            <Input name="location" defaultValue={event.location} maxLength={120} />
          </Field>
          <Field label="Description">
            <Textarea name="description" defaultValue={event.description} maxLength={2000} className="min-h-[70px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PollRowActions({ pollId, question }: { pollId: string; question: string }) {
  const { pending, run } = useRun();
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Delete poll: ${question}`}
      disabled={pending}
      onClick={() => { if (window.confirm("Delete this poll and its votes?")) run(() => deletePoll(pollId), "Poll deleted"); }}
    >
      <Trash2 className="w-3.5 h-3.5 text-[var(--status-red)]" />
    </Button>
  );
}

export function PostRowActions({ post }: { post: { id: string; title: string; body: string } }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button size="sm" variant="ghost" aria-label="Edit post" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Delete post"
        disabled={pending}
        onClick={() => { if (window.confirm("Remove this post from the feed?")) run(() => adminDeletePost(post.id), "Post removed"); }}
      >
        <Trash2 className="w-3.5 h-3.5 text-[var(--status-red)]" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit post" size="sm">
        <form action={(fd) => { run(() => adminUpdatePost(fd)); setOpen(false); }} className="space-y-4">
          <input type="hidden" name="id" value={post.id} />
          <Field label="Title">
            <Input name="title" defaultValue={post.title} maxLength={120} />
          </Field>
          <Field label="Body">
            <Textarea name="body" required defaultValue={post.body} maxLength={3000} className="min-h-[110px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Broadcast & reminders ────────────────────────────────────────────────────

export function BroadcastModal() {
  const [open, setOpen] = useState(false);
  const { run } = useRun();

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Send className="w-4 h-4" /> Send notification
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Send a notification" description="Delivered in-app instantly (plus email for the right templates).">
        <form
          action={(fd) => {
            run(() => broadcastNotification(fd), undefined, () => setOpen(false));
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience">
              <Select name="audience" defaultValue="EVERYONE">
                <option value="EVERYONE">Everyone</option>
                <option value="RESIDENTS">Residents only</option>
                <option value="ADMINS">Committee & admins</option>
                <option value="STAFF">Staff, guards & vendors</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue="NORMAL">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High — bold + red accent</option>
              </Select>
            </Field>
          </div>
          <Field label="Type">
            <Select name="type" defaultValue="ANNOUNCEMENT">
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="EVENT">Event</option>
              <option value="SECURITY">Security</option>
              <option value="SYSTEM">System</option>
            </Select>
          </Field>
          <Field label="Title">
            <Input name="title" required maxLength={120} placeholder="Water supply shutdown — Sunday 9–11 AM" />
          </Field>
          <Field label="Message">
            <Textarea name="body" maxLength={500} placeholder="Details residents should know…" className="min-h-[80px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Send notification</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function RemindersButton() {
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => sendPaymentReminders())}>
      <BellRing className="w-4 h-4" /> Send due reminders
    </Button>
  );
}

// ─── Manual (office) payment ──────────────────────────────────────────────────

export function ManualPaymentModal({
  invoice,
}: {
  invoice: { id: string; number: string; unitLabel: string; total: number };
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Record payment
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Record office payment — ${invoice.unitLabel}`} size="sm">
        <form
          action={(fd) => {
            const method = String(fd.get("method") ?? "CASH");
            const note = String(fd.get("note") ?? "");
            run(() => recordManualPayment(invoice.id, method, note));
            setOpen(false);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            {invoice.number} · <span className="font-semibold text-foreground">{invoice.unitLabel}</span> · {invoice.total.toLocaleString("en-IN")}
          </p>
          <Field label="Method" hint="Use for cash/cheque collected at the office — posts to the ledger and notifies the resident">
            <Select name="method" defaultValue="CASH">
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI (paid outside app)</option>
              <option value="NETBANKING">Net banking (outside app)</option>
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Input name="note" maxLength={200} placeholder="Cheque #004321, HDFC" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={pending}>Record payment</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Settings: billing config + portal toggles ────────────────────────────────

export function BillingConfigForm({ maintenance, dueDay }: { maintenance: number; dueDay: number }) {
  const { pending, run } = useRun();
  return (
    <form action={(fd) => run(() => saveBillingConfig(fd), "Billing defaults saved")} className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Standard maintenance (₹/unit/month)">
          <Input name="maintenance" type="number" min={0} defaultValue={maintenance} required />
        </Field>
        <Field label="Due day of month">
          <Input name="dueDay" type="number" min={1} max={28} defaultValue={dueDay} required />
        </Field>
      </div>
      <Button type="submit" size="sm" loading={pending}>Save defaults</Button>
    </form>
  );
}

export function PortalToggle({ role, label, description, enabled }: { role: string; label: string; description: string; enabled: boolean }) {
  const { pending, run } = useRun();
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Disable" : "Enable"} ${label}`}
        disabled={pending}
        onClick={() => run(() => setRoleEnabled(role, !enabled), enabled ? `${label} disabled` : `${label} enabled`)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${enabled ? "bg-[#0a0a0a]" : "bg-[var(--border-strong)]"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

// ─── Tiny dropdown primitives ─────────────────────────────────────────────────

function DropdownMenu({ items }: { items: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" className="p-1.5 rounded-lg hover:bg-[var(--muted)]" aria-label="Row actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-1 w-52 bg-white rounded-xl border border-[var(--border)] shadow-pop p-1.5" role="menu">
            {items(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ onClick, children, danger, icon }: { onClick: () => void; children: React.ReactNode; danger?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 hover:bg-[var(--muted)] ${danger ? "text-[var(--status-red)]" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}
