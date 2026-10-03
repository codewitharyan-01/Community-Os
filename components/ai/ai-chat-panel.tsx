"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Bot } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string; links?: { label: string; href: string }[] };

export function AIChatPanel({
  mode,
  suggestions,
  ask,
  floating = true,
  raised = false,
  title = "Ask Community OS",
  subtitle = "Grounded in your community's live data",
}: {
  mode: "resident" | "admin";
  suggestions: string[];
  ask: (question: string) => Promise<{ answer: string; links?: { label: string; href: string }[] }>;
  floating?: boolean;
  raised?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask(question);
      setMsgs((m) => [...m, { role: "ai", text: res.answer, links: res.links }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Sorry — I couldn't process that. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className={cn(
            "bg-white border border-[var(--border)] shadow-modal rounded-2xl flex flex-col overflow-hidden",
            floating ? "fixed z-[70] bottom-24 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-[400px] h-[520px] max-h-[70vh]" : "h-full"
          )}
          role="dialog"
          aria-label={title}
        >
          <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--subtle)]">
            <span className="w-8 h-8 rounded-lg bg-[#0a0a0a] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-2xs text-muted-foreground">{subtitle}</p>
            </div>
            {floating && (
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="ml-auto p-1.5 hover:bg-[var(--muted)] rounded-lg">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {msgs.length === 0 && (
              <div>
                <div className="flex gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {mode === "resident"
                      ? "Hi! I can check your dues, complaint status, events, parking and visitors. What do you need?"
                      : "Hi! Ask me about collections, overdue residents, open issues, expenses or expiring vendor contracts."}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs border border-[var(--border-strong)] rounded-full px-3 py-1.5 hover:bg-[var(--muted)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
                {m.role === "ai" && (
                  <span className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                    m.role === "user" ? "bg-[#0a0a0a] text-white" : "bg-[var(--subtle)] border border-[var(--border)]"
                  )}
                >
                  {m.text}
                  {m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => floating && setOpen(false)}
                          className="text-xs font-medium underline underline-offset-2"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </span>
                <div className="bg-[var(--subtle)] border border-[var(--border)] rounded-2xl px-4 py-3 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#b3b3b0] animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-[var(--border)] flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "resident" ? "Ask about dues, issues, events…" : "Ask about collections, issues, vendors…"}
              className="flex-1 h-10 rounded-[10px] border border-[var(--border-strong)] px-3 text-sm focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]"
              aria-label="Ask the assistant"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-[10px] bg-[#0a0a0a] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!floating) return panel;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-[70] right-4 sm:right-6 flex items-center gap-2 rounded-full bg-[#0a0a0a] text-white shadow-pop pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-[#262626] transition-colors",
          raised ? "bottom-36 sm:bottom-6" : "bottom-6"
        )}
      >
        <Sparkles className="w-4 h-4" />
        Ask Community OS
      </button>
      {panel}
    </>
  );
}
