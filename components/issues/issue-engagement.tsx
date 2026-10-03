"use client";

import { useState, useTransition } from "react";
import { ArrowBigUp, Send, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ReportModal } from "@/components/community/post-card";
import { useToast } from "@/components/ui/toaster";
import { toggleIssueVote, addIssueComment, verifyIssue } from "@/app/actions/issues";
import { cn, relativeTime } from "@/lib/utils";

export function IssueEngagement({
  issueId,
  upvoteCount,
  hasVoted,
  comments,
  canVerify,
  isMine,
}: {
  issueId: string;
  upvoteCount: number;
  hasVoted: boolean;
  comments: { id: string; body: string; authorName: string; authorHue: number; createdAt: string; internal: boolean }[];
  canVerify: boolean;
  isMine: boolean;
}) {
  const [voted, setVoted] = useState(hasVoted);
  const [votes, setVotes] = useState(upvoteCount);
  const [text, setText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onVote() {
    const next = !voted;
    setVoted(next);
    setVotes((v) => v + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await toggleIssueVote(issueId);
        setVotes(res.count);
      } catch {
        setVoted(!next);
        toast("error", "Vote failed");
      }
    });
  }

  function onComment(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    startTransition(async () => {
      try {
        await addIssueComment(issueId, body);
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Comment failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onVote}
          disabled={pending}
          aria-pressed={voted}
          className={cn(
            "flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-sm font-medium transition-colors",
            voted ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[var(--border-strong)] hover:border-[#0a0a0a]"
          )}
        >
          <ArrowBigUp className={cn("w-4 h-4", voted && "fill-current")} /> Upvote · <span className="num">{votes}</span>
        </button>
        {!isMine && (
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>Report</Button>
        )}
        {canVerify && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => startTransition(async () => {
              try {
                await verifyIssue(issueId);
                toast("success", "Thank you for confirming!", "Issue marked as verified.");
              } catch (err) {
                toast("error", err instanceof Error ? err.message : "Verify failed");
              }
            })}
          >
            <BadgeCheck className="w-4 h-4" /> It&rsquo;s fixed — verify
          </Button>
        )}
      </div>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">Comments ({comments.filter((c) => !c.internal).length})</p>
        <div className="space-y-3.5">
          {comments.filter((c) => !c.internal).length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {comments.filter((c) => !c.internal).map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.authorName} hue={c.authorHue} size="xs" />
              <div className="min-w-0">
                <p className="text-xs font-medium">{c.authorName} <span className="text-muted-foreground font-normal">· {relativeTime(c.createdAt)}</span></p>
                <p className="text-[13px] mt-0.5 leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={onComment} className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" maxLength={1000} aria-label="Add comment" className="h-9 text-[13px]" />
          <Button type="submit" size="sm" aria-label="Send"><Send className="w-3.5 h-3.5" /></Button>
        </form>
      </Card>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="ISSUE" targetId={issueId} />
    </div>
  );
}
