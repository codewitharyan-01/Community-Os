"use client";

import { useState, useActionState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { createPost, type PostState } from "@/app/actions/community";
import { POST_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/toaster";

const TYPES_FOR_RESIDENTS = ["DISCUSSION", "SUGGESTION", "LOST_FOUND", "APPRECIATION"] as const;

export function PostComposer({ canAnnounce, autoOpen = false }: { canAnnounce: boolean; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [state, action] = useActionState<PostState, FormData>(createPost, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast("success", "Posted to the community feed");
      setOpen(false);
    }
  }, [state, toast]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl border border-[var(--border)] bg-card shadow-card px-4 py-3.5 text-sm text-muted-foreground hover:border-[var(--border-strong)] transition-colors"
      >
        Share something with your community…
      </button>
    );
  }

  return (
    <Card className="p-4">
      <form action={action} className="space-y-3">
        <div className="flex gap-2">
          <Select name="type" defaultValue="DISCUSSION" className="w-44" aria-label="Post type">
            {(canAnnounce ? ["ANNOUNCEMENT", ...TYPES_FOR_RESIDENTS.slice(0, 0), ...TYPES_FOR_RESIDENTS, "ALERT"] : [...TYPES_FOR_RESIDENTS]).map((t) => (
              <option key={t} value={t}>{POST_TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </div>
        <Input name="title" placeholder="Title (optional)" maxLength={120} aria-label="Post title" />
        <Textarea name="body" placeholder="What's on your mind?" required aria-label="Post body" />
        {state.fieldErrors?.body && <p className="text-2xs text-[var(--status-red)]">{state.fieldErrors.body}</p>}
        {state.error && <p className="text-2xs text-[var(--status-red)]">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" size="sm">Post</Button>
        </div>
      </form>
    </Card>
  );
}
