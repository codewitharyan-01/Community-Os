"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowBigUp, MessageSquare, Flag, Trash2, Pin, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { togglePostVote, addPostComment, reportContent, deleteOwnPost } from "@/app/actions/community";
import { cn, relativeTime } from "@/lib/utils";
import { POST_TYPE_LABELS } from "@/lib/constants";

export type PostDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  commentsLocked: boolean;
  upvoteCount: number;
  commentCount: number;
  createdAt: string;
  authorName: string;
  authorHue: number;
  isMine: boolean;
  hasVoted: boolean;
  comments: { id: string; body: string; authorName: string; authorHue: number; createdAt: string }[];
};

export function PostCard({ post }: { post: PostDTO }) {
  const [voted, setVoted] = useState(post.hasVoted);
  const [votes, setVotes] = useState(post.upvoteCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [commentText, setCommentText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onVote() {
    const nextVoted = !voted;
    setVoted(nextVoted);
    setVotes((v) => v + (nextVoted ? 1 : -1));
    startTransition(async () => {
      try {
        await togglePostVote(post.id);
      } catch {
        setVoted(!nextVoted);
        setVotes((v) => v + (nextVoted ? -1 : 1));
        toast("error", "Could not record your vote");
      }
    });
  }

  function onComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    setComments((c) => [...c, { id: `tmp-${Date.now()}`, body: text, authorName: "You", authorHue: 0, createdAt: new Date().toISOString() }]);
    startTransition(async () => {
      try {
        await addPostComment(post.id, text);
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Comment failed");
      }
    });
  }

  const toneForType: Record<string, "black" | "orange" | "blue" | "green" | "red" | "gray"> = {
    ANNOUNCEMENT: "black", ALERT: "red", SUGGESTION: "blue", APPRECIATION: "green",
    LOST_FOUND: "orange", EVENT: "gray", DISCUSSION: "gray",
  };

  return (
    <Card className={cn("overflow-hidden", post.pinned && "border-[#0a0a0a]")}>
      {(post.pinned || post.type !== "DISCUSSION") && (
        <div className="px-4 pt-3.5 flex items-center gap-2">
          {post.pinned && <Badge tone="black"><Pin className="w-3 h-3" /> Pinned</Badge>}
          {post.type !== "DISCUSSION" && <Badge tone={toneForType[post.type] ?? "gray"}>{POST_TYPE_LABELS[post.type] ?? post.type}</Badge>}
        </div>
      )}
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <Avatar name={post.authorName} hue={post.authorHue} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{post.authorName}</p>
            <p className="text-2xs text-muted-foreground">{relativeTime(post.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {post.isMine && (
              <Button variant="ghost" size="sm" aria-label="Delete post" onClick={() => startTransition(async () => {
                try { await deleteOwnPost(post.id); toast("success", "Post deleted"); } catch { toast("error", "Delete failed"); }
              })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" aria-label="Report post" onClick={() => setReportOpen(true)}>
              <Flag className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {post.title && <h3 className="text-[15px] font-semibold tracking-tight mt-3">{post.title}</h3>}
        <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed whitespace-pre-line">{post.body}</p>
      </div>

      <div className="px-2 pb-2 flex items-center gap-1 border-t border-[var(--border)] pt-1.5 mx-2 mb-2">
        <button
          onClick={onVote}
          disabled={pending}
          aria-pressed={voted}
          aria-label="Upvote"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            voted ? "text-[#0a0a0a]" : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted)]"
          )}
        >
          <ArrowBigUp className={cn("w-4.5 h-4.5 w-[18px] h-[18px]", voted && "fill-current")} /> {votes}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--muted)] transition-colors"
        >
          <MessageSquare className="w-4 h-4" /> {Math.max(comments.length, post.commentCount)}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[var(--subtle)] border-t border-[var(--border)]"
          >
            <div className="px-4 py-3 space-y-3">
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.authorName} hue={c.authorHue} size="xs" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{c.authorName} <span className="text-muted-foreground font-normal">· {relativeTime(c.createdAt)}</span></p>
                    <p className="text-[13px] text-foreground/90 mt-0.5 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              ))}
              {!post.commentsLocked && (
                <form onSubmit={onComment} className="flex items-center gap-2 pt-1">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="h-9 text-[13px]"
                    aria-label="Write a comment"
                    maxLength={1000}
                  />
                  <Button type="submit" size="sm" aria-label="Send comment">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              )}
              {post.commentsLocked && <p className="text-xs text-muted-foreground">Comments are locked.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="POST" targetId={post.id} />
    </Card>
  );
}

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "POST" | "COMMENT" | "ISSUE";
  targetId: string;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Modal open={open} onClose={onClose} title="Report to moderators" description="Your report is anonymous to the community. Admins review every report." size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              await reportContent(targetType, targetId, reason);
              toast("success", "Report submitted", "Admins have been notified.");
              setReason("");
              onClose();
            } catch (err) {
              toast("error", err instanceof Error ? err.message : "Report failed");
            }
          });
        }}
        className="space-y-3"
      >
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with this content?" required maxLength={500} aria-label="Report reason" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" variant="danger" loading={pending}>Submit report</Button>
        </div>
      </form>
    </Modal>
  );
}
