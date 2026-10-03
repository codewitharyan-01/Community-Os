"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toaster";
import { updateProfile, updatePrivacy, requestDataExport, type ProfileState } from "@/app/actions/account";
import { InstallCard } from "@/components/pwa/install-button";
import { Select as Sel } from "@/components/ui/input";

type Member = { id: string; name: string; type: string };
type VehicleRow = { id: string; number: string; model: string };

export function ProfileClient({
  user,
  membership,
  family,
  vehicles,
}: {
  user: { name: string; phone: string; email: string; role: string; emergencyContact: string; language: string; avatarHue: number; privacy: Record<string, string> };
  membership: { communityName: string; buildingName: string; floor: number; label: string; type: string; since: string } | null;
  family: Member[];
  vehicles: VehicleRow[];
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, {});
  
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast("success", "Profile updated");
  }, [state, toast]);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
          <Avatar name={user.name} hue={user.avatarHue} size="lg" />
        </CardHeader>
        <CardBody>
          <form action={action} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={state.fieldErrors?.name}>
                <Input name="name" defaultValue={user.name} required maxLength={80} />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={user.phone} maxLength={20} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email (read-only)">
                <Input defaultValue={user.email} disabled />
              </Field>
              <Field label="Preferred language">
                <Select name="language" defaultValue={user.language}>
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">हिन्दी</option>
                  <option value="gu-IN">ગુજરાતી</option>
                </Select>
              </Field>
            </div>
            <Field label="Emergency contact">
              <Input name="emergencyContact" defaultValue={user.emergencyContact} maxLength={120} placeholder="Name · relationship · phone" />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={false}>Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Residence */}
      <Card>
        <CardHeader><CardTitle>Residence</CardTitle></CardHeader>
        <CardBody>
          {membership ? (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <Item label="Community" value={membership.communityName} />
              <Item label="Building" value={membership.buildingName} />
              <Item label="Floor" value={`Floor ${membership.floor}`} />
              <Item label="Flat" value={membership.label} />
              <Item label="Status" value={membership.type.charAt(0) + membership.type.slice(1).toLowerCase()} />
              <Item label="Member since" value={membership.since} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Your residence details will appear once the admin links you to a unit.</p>
          )}
          {family.length > 1 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-muted-foreground mb-2">Household members</p>
              <div className="flex flex-wrap gap-2">
                {family.map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-2 text-xs border border-[var(--border)] rounded-full px-3 py-1.5">
                    <Avatar name={f.name} size="xs" />
                    {f.name} · {f.type.toLowerCase().replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
          {vehicles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs font-medium text-muted-foreground mb-2">Registered vehicles</p>
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <span key={v.id} className="text-xs font-mono border border-[var(--border)] rounded-full px-3 py-1.5">{v.number}</span>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <PrivacyCard initial={user.privacy} />

      <Card>
        <CardHeader><CardTitle>App & data</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <InstallCard />
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">Download my data</p>
              <p className="text-xs text-muted-foreground mt-0.5">You&rsquo;ll receive an export link by email (mock provider — see Developer Tools).</p>
            </div>
            <DataExportButton />
          </div>
          <p className="text-2xs text-muted-foreground pt-3 border-t border-[var(--border)] leading-relaxed">
            This demo implements compliance-ready architecture (consent records, scoped visibility, audit logs).
            Production deployment requires jurisdiction-specific legal review.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function PrivacyCard({ initial }: { initial: Record<string, string> }) {
  const [phoneVis, setPhoneVis] = useState(initial.phoneVisibility ?? "ADMINS");
  const [profileVis, setProfileVis] = useState(initial.profileVisibility ?? "COMMUNITY");
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  function set(key: "phoneVisibility" | "profileVisibility", value: string) {
    startTransition(async () => {
      try {
        await updatePrivacy(key, value);
        toast("success", "Privacy setting saved");
      } catch {
        toast("error", "Could not save setting");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <div>
          <p className="text-sm font-medium">Phone number visibility</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">Your number is never shown in vehicle lookup regardless of this setting.</p>
          <Sel value={phoneVis} onChange={(e) => { setPhoneVis(e.target.value); set("phoneVisibility", e.target.value); }}>
            <option value="NOBODY">Nobody</option>
            <option value="ADMINS">Society admins only</option>
            <option value="RESIDENTS">Verified residents</option>
          </Sel>
        </div>
        <div>
          <p className="text-sm font-medium">Profile visibility</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">Controls whether neighbours can see your name next to posts and issues.</p>
          <Sel value={profileVis} onChange={(e) => { setProfileVis(e.target.value); set("profileVisibility", e.target.value); }}>
            <option value="PRIVATE">Private (masked)</option>
            <option value="COMMUNITY">Visible to community</option>
          </Sel>
        </div>
      </CardBody>
    </Card>
  );
}

function DataExportButton() {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => startTransition(async () => {
        try {
          await requestDataExport();
          toast("success", "Export requested", "Check Developer Tools → Email preview.");
        } catch {
          toast("error", "Request failed");
        }
      })}
    >
      Request export
    </Button>
  );
}
