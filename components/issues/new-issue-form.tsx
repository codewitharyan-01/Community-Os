"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { createIssue, type IssueState } from "@/app/actions/issues";
import { ISSUE_CATEGORIES, ISSUE_CATEGORY_LABELS, SEVERITIES, SEVERITY_LABELS } from "@/lib/constants";
import { useRef } from "react";

export function NewIssueForm() {
  const [state, action] = useActionState<IssueState, FormData>(createIssue, {});
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok && state.issueId) {
      toast("success", "Issue reported", "You'll be notified at every status change.");
      router.push(`/resident/services/issues/${state.issueId}`);
    }
  }, [state, router, toast]);

  return (
    <Card className="p-5 sm:p-6">
      <form ref={formRef} action={action} className="space-y-4">
        <Field label="Title" error={state.fieldErrors?.title}>
          <Input name="title" required maxLength={120} placeholder="Water leakage in Block B basement" />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Category" error={state.fieldErrors?.category}>
            <Select name="category" defaultValue="WATER">
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{ISSUE_CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Severity" error={state.fieldErrors?.severity} hint="Critical = 1h SLA, High = 4h, Medium = 24h, Low = 72h">
            <Select name="severity" defaultValue="MEDIUM">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Location (optional)">
            <Input name="location" maxLength={120} placeholder="Block B basement" />
          </Field>
        </div>

        <Field label="Describe the issue" error={state.fieldErrors?.description}>
          <Textarea name="description" required maxLength={2000} placeholder="What's happening, since when, and what area is affected?" />
        </Field>

        <Field label="Photo / document (optional)" hint="JPG, PNG, WEBP or PDF up to 8MB">
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="w-full text-sm text-muted-foreground file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--muted)] file:text-foreground file:text-sm file:font-medium hover:file:bg-[#ececea] file:cursor-pointer"
          />
        </Field>

        {state.error && <p className="text-sm text-[var(--status-red)] bg-[var(--status-red-bg)] rounded-lg px-3 py-2.5">{state.error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Submit issue</Button>
        </div>
      </form>
    </Card>
  );
}
