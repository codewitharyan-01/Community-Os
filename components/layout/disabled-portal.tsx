import Link from "next/link";

/** Shown when the community admin has disabled the portal for this role. */
export function DisabledPortalScreen({ role }: { role: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-[var(--status-orange-bg)] text-[var(--status-orange)] flex items-center justify-center mx-auto mb-5 text-lg">
          ⏸
        </div>
        <h1 className="text-lg font-semibold tracking-tight">This portal is currently disabled</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          The {role.replace(/_/g, " ").toLowerCase()} portal has been turned off by your community
          admin. If you believe this is a mistake, contact the committee.
        </p>
        <Link href="/login" className="inline-block mt-6 text-sm font-medium underline underline-offset-4">
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
