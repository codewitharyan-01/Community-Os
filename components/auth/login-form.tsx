"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO = {
  resident: { email: "resident@demo.local", password: "demo123" },
  admin: { email: "admin@demo.local", password: "admin123" },
  accountant: { email: "accountant@demo.local", password: "accountant123" },
  security: { email: "security@demo.local", password: "security123" },
  vendor: { email: "vendor@demo.local", password: "vendor123" },
  staff: { email: "staff@demo.local", password: "staff123" },
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ prefill }: { prefill?: keyof typeof DEMO }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(prefill ? DEMO[prefill].email : "");
  const [password, setPassword] = useState(prefill ? DEMO[prefill].password : "");

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-medium text-muted-foreground mb-1.5">Email</span>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-muted-foreground mb-1.5">Password</span>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>
      {state.error && (
        <p className="text-sm text-[var(--status-red)] bg-[var(--status-red-bg)] rounded-lg px-3 py-2.5">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
