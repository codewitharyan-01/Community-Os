"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { updateCommunitySettings } from "@/app/actions/admin";

export function SettingsForm({
  name,
  city,
  code,
  address,
}: {
  name: string;
  city: string;
  code: string;
  address: string;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          try {
            await updateCommunitySettings(fd);
            toast("success", "Settings saved");
          } catch (err) {
            toast("error", err instanceof Error ? err.message : "Save failed");
          }
        })
      }
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Community name">
          <Input name="name" defaultValue={name} required maxLength={120} />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={city} maxLength={80} />
        </Field>
      </div>
      <Field label="Address">
        <Input name="address" defaultValue={address} maxLength={200} />
      </Field>
      <Field label="Community join code" hint="Residents use this code during onboarding (read-only in demo)">
        <Input defaultValue={code} disabled className="font-mono" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending}>Save changes</Button>
      </div>
    </form>
  );
}
