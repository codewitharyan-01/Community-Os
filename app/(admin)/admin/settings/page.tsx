import { Building2, CreditCard, ShieldCheck, Mail, UsersRound, Plug } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCommunityConfig, getDisabledRoles, TOGGLEABLE_ROLES } from "@/lib/community-config";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetDemoButton } from "@/components/admin/admin-client";
import { BillingConfigForm, PortalToggle, AddTeamMemberModal, TeamMemberRowActions } from "@/components/admin/crud";
import { SettingsForm } from "@/components/admin/settings-client";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Settings" };

const TEAM_ROLE_OPTIONS = [
  { value: "COMMUNITY_ADMIN", label: "Community Admin" },
  { value: "COMMITTEE_MEMBER", label: "Committee Member" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "FACILITY_MANAGER", label: "Facility Manager" },
  { value: "SECURITY_MANAGER", label: "Security Manager" },
  { value: "SECURITY_GUARD", label: "Security Guard" },
  { value: "MAINTENANCE_STAFF", label: "Maintenance Staff" },
];

export default async function AdminSettings() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const canSettings = can(user.role, "settings.manage");

  const [community, org, emails, config, disabledRoles, team] = await Promise.all([
    db.community.findUnique({ where: { id: communityId } }),
    db.community.findUnique({ where: { id: communityId }, select: { organization: true } }),
    db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    getCommunityConfig(communityId),
    getDisabledRoles(communityId),
    db.user.findMany({
      where: { communityId, role: { notIn: ["OWNER", "TENANT", "FAMILY_MEMBER"] }, active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const paymentConnected = Boolean(process.env.PAYMENT_PROVIDER_KEY);
  const emailConnected = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const aiConnected = Boolean(process.env.AI_API_KEY);

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Settings" subtitle="Community profile, team, roles, billing defaults, integrations and developer tools." />

      {canSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Community profile</CardTitle>
          </CardHeader>
          <CardBody>
            <SettingsForm name={community?.name ?? ""} city={community?.city ?? ""} code={community?.code ?? ""} address={community?.address ?? ""} />
          </CardBody>
        </Card>
      )}

      {/* Team management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersRound className="w-4 h-4" /> Team & access</CardTitle>
          {canSettings && <AddTeamMemberModal />}
        </CardHeader>
        <CardBody>
          <div className="divide-y divide-[var(--border)]">
            {team.map((m) => (
              <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {m.name} {!m.active && <span className="text-2xs text-[var(--status-red)]">· deactivated</span>}
                  </p>
                  <p className="text-2xs text-muted-foreground">{m.email} · joined {formatDate(m.createdAt)}</p>
                </div>
                {canSettings ? (
                  <TeamMemberRowActions
                    member={{ id: m.id, name: m.name, role: m.role, active: m.active }}
                    roles={TEAM_ROLE_OPTIONS}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] ?? m.role}</span>
                )}
              </div>
            ))}
            {team.length === 0 && <p className="py-4 text-sm text-muted-foreground">No team members yet — add your first admin or guard.</p>}
          </div>
        </CardBody>
      </Card>

      {/* Portal / role toggles */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Portal access by role</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Turn off portals your community doesn&rsquo;t use — e.g. disable the guard desk if guards won&rsquo;t use the app. Disabled roles lose access immediately (sessions revoked).
            </p>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {canSettings ? (
            TOGGLEABLE_ROLES.map((r) => (
              <PortalToggle
                key={r.role}
                role={r.role}
                label={r.label}
                description={r.description}
                enabled={!disabledRoles.includes(r.role)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">Only Community Admins can change portal access.</p>
          )}
          <p className="text-2xs text-muted-foreground mt-3">
            Core resident roles (owner, tenant, family) and the primary community admin always stay enabled.
          </p>
        </CardBody>
      </Card>

      {/* Billing config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing defaults</CardTitle>
        </CardHeader>
        <CardBody>
          {canSettings ? (
            <BillingConfigForm maintenance={config.maintenance ?? 2500} dueDay={config.dueDay ?? 10} />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-2xs text-muted-foreground">Standard maintenance</dt><dd className="font-medium">{config.maintenance ?? 2500}</dd></div>
              <div><dt className="text-2xs text-muted-foreground">Due day</dt><dd className="font-medium">{config.dueDay ?? 10}</dd></div>
            </dl>
          )}
          <p className="text-2xs text-muted-foreground mt-3">
            New billing runs pre-fill from these defaults. Join code: <span className="font-mono">{community?.code}</span> · Organization: {org?.organization?.name ?? "—"}
          </p>
        </CardBody>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="w-4 h-4" /> Integrations</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3 text-sm">
            <IntegrationRow
              name="Payments"
              status={paymentConnected ? "Provider connected" : "Mock gateway (demo)"}
              connected={paymentConnected}
              note="Razorpay/Stripe-compatible provider seam — payments are simulated until keys are added."
            />
            <IntegrationRow
              name="Email"
              status={emailConnected ? "SMTP connected" : "Mock outbox (demo)"}
              connected={emailConnected}
              note="All emails are visible below and in Developer Tools."
            />
            <IntegrationRow
              name="AI"
              status={aiConnected ? "LLM connected" : "Built-in local assistant"}
              connected={aiConnected}
              note="The deterministic assistant works offline; add AI_API_KEY to upgrade the engine."
            />
            <IntegrationRow name="SMS / WhatsApp" status="Architecture-ready" connected={false} note="Provider seam reserved — enable later without code changes." />
          </div>
        </CardBody>
      </Card>

      {/* Email outbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email preview (mock outbox)</CardTitle>
        </CardHeader>
        <CardBody>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails yet — trigger a payment or invoice to see one here.</p>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto -mx-1 px-1">
              {emails.map((e) => (
                <div key={e.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium truncate">{e.subject}</p>
                    <span className="text-2xs text-muted-foreground shrink-0">{formatDate(e.createdAt)}</span>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-0.5">To: {e.to} · template: {e.template}</p>
                  <p className="text-2xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">{e.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle>Developer tools</CardTitle>
            <span className="text-2xs text-muted-foreground border border-[var(--border)] rounded-full px-2 py-0.5">development mode only</span>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Restores the database to the original seed. You will be signed out.
            </p>
            <ResetDemoButton />
          </CardBody>
        </Card>
      )}

      <p className="text-2xs text-muted-foreground leading-relaxed">
        This demo contains compliance-ready architecture (consent records, scoped visibility, audit logs, idempotent payments).
        Production deployment requires jurisdiction-specific legal review.
      </p>
    </div>
  );
}

function IntegrationRow({ name, status, connected, note }: { name: string; status: string; connected: boolean; note: string }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{note}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 text-2xs font-medium rounded-full px-2.5 py-1 shrink-0 ${connected ? "bg-[var(--status-green-bg)] text-[var(--status-green)]" : "bg-[var(--muted)] text-muted-foreground"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[var(--status-green)]" : "bg-[var(--border-strong)]"}`} />
        {status}
      </span>
    </div>
  );
}
