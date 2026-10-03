"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";
import { postChannelMessage } from "@/app/actions/channels";

type Msg = { id: string; body: string; authorName: string; authorHue: number; createdAt: string };

const REACTIONS = ["👍", "❤️", "😂", "🙏", "🎉"];

/** Structured community channels (chat-lite: messages + reactions, refresh-live via RSC). */
export function Channels({ channel, messages }: { channel: string; messages: Msg[] }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [reacts, setReacts] = useState<Record<string, string[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, channel]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    startTransition(async () => {
      try {
        await postChannelMessage(channel, body);
      } catch {
        // message will appear after revalidate; no-op on failure
      }
    });
  }

  function react(msgId: string, emoji: string) {
    setReacts((r) => {
      const list = r[msgId] ?? [];
      return { ...r, [msgId]: list.includes(emoji) ? list.filter((e) => e !== emoji) : [...list, emoji] };
    });
  }

  return (
    <Card className="flex flex-col overflow-hidden h-[560px]">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--subtle)]">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{channel}</p>
        <p className="text-2xs text-muted-foreground ml-auto hidden sm:block">structured channels — not another group chat</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No messages in #{channel} yet. Start the conversation.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="group flex gap-3">
            <Avatar name={m.authorName} hue={m.authorHue} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs">
                <span className="font-medium">{m.authorName}</span>
                <span className="text-muted-foreground ml-2">{relativeTime(m.createdAt)}</span>
              </p>
              <p className="text-sm mt-0.5 leading-relaxed break-words">{m.body}</p>
              {(reacts[m.id]?.length ?? 0) > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {reacts[m.id].map((e) => (
                    <span key={e} className="text-xs bg-[var(--muted)] rounded-full px-1.5 py-0.5">{e}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5">
              {REACTIONS.map((e) => (
                <button key={e} onClick={() => react(m.id, e)} aria-label={`React ${e}`} className="w-7 h-7 rounded-lg hover:bg-[var(--muted)] flex items-center justify-center text-sm">
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="p-3 border-t border-[var(--border)] flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message #${channel.toLowerCase().replace(/ /g, "")}`}
          className="flex-1 h-10 rounded-[10px] border border-[var(--border-strong)] px-3 text-sm focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]"
          aria-label={`Message ${channel}`}
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label="Send message"
          className="w-10 h-10 rounded-[10px] bg-[#0a0a0a] text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </Card>
  );
}
