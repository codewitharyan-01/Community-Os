import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoInverse } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth";
import { portalForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getDisabledRoles } from "@/lib/community-config";

const DEMO_ACCOUNTS = [
  { role: "Resident", email: "resident@demo.local", pass: "demo123", key: "resident" as const, desc: "Aryan Patel · A-402" },
  { role: "Community Admin", email: "admin@demo.local", pass: "admin123", key: "admin" as const, desc: "Meera Shah · full command center" },
  { role: "Accountant", email: "accountant@demo.local", pass: "accountant123", key: "accountant" as const, desc: "Rohan Mehta · finance & reports" },
  { role: "Security Guard", email: "security@demo.local", pass: "security123", key: "security" as const, desc: "Jagdish Singh · gate desk" },
  { role: "Vendor", email: "vendor@demo.local", pass: "vendor123", key: "vendor" as const, desc: "Suresh Elevators · tasks" },
  { role: "Maintenance Staff", email: "staff@demo.local", pass: "staff123", key: "staff" as const, desc: "Ramesh Prajapati · assignments" },
];

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; disabled?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(portalForRole(user.role));
  const { demo, disabled, error } = await searchParams;
  const prefill = DEMO_ACCOUNTS.find((d) => d.key === demo)?.key;

  // Respect admin role-disabling for the demo quick logins
  const primaryCommunity = await db.community.findFirst({ select: { id: true } });
  const disabledRoles = primaryCommunity ? await getDisabledRoles(primaryCommunity.id) : [];
  const enabledAccounts = DEMO_ACCOUNTS.filter((d) => {
    const roleMap: Record<string, string> = { resident: "OWNER", admin: "COMMUNITY_ADMIN", accountant: "TREASURER", security: "SECURITY_GUARD", vendor: "VENDOR", staff: "MAINTENANCE_STAFF" };
    return !disabledRoles.includes(roleMap[d.key]);
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 sm:px-12 lg:px-16 py-8">
        <Link href="/" className="flex items-center gap-2.5 w-fit" aria-label="Back to home">
          <span className="w-7 h-7 rounded-lg bg-[#0a0a0a] text-white flex items-center justify-center text-[13px] font-bold">C</span>
          <span className="font-semibold tracking-tight text-[15px]">Community<span className="text-muted-foreground font-medium"> OS</span></span>
        </Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto py-12">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5 mb-8">Sign in to your community workspace.</p>
            {(disabled || error) && (
              <p className="text-sm text-[var(--status-orange)] bg-[var(--status-orange-bg)] rounded-lg px-3 py-2.5 mb-4">
                {disabled
                  ? "That portal has been disabled by the community admin."
                  : "Demo account not found — run npm run seed first."}
              </p>
            )}
            <LoginForm prefill={prefill} />
            <p className="text-xs text-muted-foreground mt-6">
              Local demo — no OTP or external providers required.{" "}
              <Link href="/" className="underline underline-offset-2 hover:text-foreground">Back to site</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Demo accounts side */}
      <div className="hidden lg:flex bg-[#0a0a0a] text-white flex-col px-14 py-12">
        <LogoInverse className="w-8 h-8" />
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          <h2 className="text-xl font-semibold tracking-tight">One-tap demo accounts</h2>
          <p className="text-sm text-white/50 mt-2 mb-8">
            Every role, fully seeded. Tap once — you&rsquo;re straight in.
          </p>
          <div className="space-y-2.5">
            {enabledAccounts.map((d) => (
              <Link
                key={d.email}
                href={`/api/demo-login/${d.key}`}
                className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 hover:bg-white/[0.09] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.role}</span>
                  <span className="text-2xs font-medium text-white/40 group-hover:text-white/80 transition-colors">One-tap →</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{d.desc} · {d.email}</p>
              </Link>
            ))}
          </div>
        </div>
        <p className="text-2xs text-white/30 max-w-md mx-auto w-full">
          Demo data resets from Settings → Developer Tools. Payments are simulated via a mock gateway.
        </p>
      </div>
    </div>
  );
}
