import { Sparkles, ShieldCheck, Bot, Lightbulb } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { generateInsights } from "@/lib/insights";
import { askAdminQuery } from "@/app/actions/ai-admin";
import { buildAttentionBrief } from "@/lib/ai";

export const metadata = { title: "AI" };

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  repeat: Lightbulb, "map-pin": Lightbulb, "trending-down": Lightbulb, "trending-up": Lightbulb,
  wallet: Lightbulb, "file-warning": Lightbulb, clock: Lightbulb, "check-circle": Lightbulb,
};

export default async function AdminAI() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;

  const [insights, brief] = await Promise.all([generateInsights(communityId), buildAttentionBrief(communityId)]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Community Intelligence"
        subtitle="A copilot grounded in your community's live data — never an authority."
      />

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <Card className="h-[560px]">
            <AIChatPanel
              mode="admin"
              suggestions={["What needs my attention today?", "Show overdue residents", "What are the top unresolved issues?", "Summarize this month's expenses", "Which vendor contracts expire soon?"]}
              ask={askAdminQuery}
              floating={false}
              title="Admin copilot"
              subtitle="Ask anything about collections, issues, expenses, vendors"
            />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="w-4 h-4" /> Today&rsquo;s brief</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm leading-relaxed whitespace-pre-line">{brief}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Insights</CardTitle>
            </CardHeader>
            <CardBody className="pt-0 space-y-3">
              {insights.map((ins, i) => {
                const Icon = INSIGHT_ICONS[ins.icon] ?? Lightbulb;
                return (
                <div key={i} className="flex gap-2.5">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs ${ins.tone === "warn" ? "bg-[var(--status-orange-bg)] text-[var(--status-orange)]" : ins.tone === "good" ? "bg-[var(--status-green-bg)] text-[var(--status-green)]" : "bg-[var(--status-blue-bg)] text-[var(--status-blue)]"}`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  <p className="text-[13px] leading-relaxed">{ins.text}</p>
                </div>
                );
              })}
              {insights.length === 0 && <p className="text-sm text-muted-foreground">Nothing notable right now.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Guardrails</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <li>• The assistant reads only community-scoped data via fixed tools.</li>
                <li>• It cannot move money, approve expenses or change records.</li>
                <li>• Governance decisions always require a human sign-off.</li>
                <li>• Answers cite live figures — no fabricated numbers.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
