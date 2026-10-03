"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, CornerDownLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { globalSearch, type SearchGroup } from "@/app/actions/search";

type Action = { id: string; title: string; hint: string; href: string };

export function CommandPalette({ actions, isAdmin }: { actions: Action[]; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filteredActions = actions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
    else {
      setQuery("");
      setGroups([]);
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    if (!isAdmin || query.trim().length < 2) {
      setGroups([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setGroups(res);
      } catch {
        setGroups([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, isAdmin]);

  const flat: { title: string; hint: string; href: string }[] = [
    ...filteredActions.map((a) => ({ title: a.title, hint: a.hint, href: a.href })),
    ...groups.flatMap((g) => g.items.map((i) => ({ title: i.title, hint: `${g.label} · ${i.subtitle}`, href: i.href }))),
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && flat[highlight]) {
      e.preventDefault();
      go(flat[highlight].href);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 rounded-[10px] border border-[var(--border-strong)] px-3 text-sm text-muted-foreground hover:border-[#0a0a0a] transition-colors w-full sm:w-64"
        aria-label="Open command palette"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search anything…</span>
        <kbd className="ml-auto hidden sm:flex items-center gap-0.5 text-2xs font-mono bg-[var(--muted)] rounded px-1.5 py-0.5">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[85] flex items-start justify-center pt-[12vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-modal border border-[var(--border)] overflow-hidden"
              role="dialog"
              aria-label="Command palette"
            >
              <div className="flex items-center gap-2.5 px-4 border-b border-[var(--border)]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                  onKeyDown={onKeyDown}
                  placeholder="Search residents, units, vehicles, invoices… or run a command"
                  className="flex-1 h-12 text-sm bg-transparent focus:outline-none"
                  aria-label="Search"
                />
                {searching && <span className="text-2xs text-muted-foreground">searching…</span>}
              </div>
              <div className="max-h-[46vh] overflow-y-auto p-2">
                {flat.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {query ? "No results. Try a name, flat or invoice number." : "Type to search, or pick a command below."}
                  </p>
                )}
                {flat.map((item, i) => (
                  <button
                    key={`${item.href}-${item.title}-${i}`}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-colors",
                      highlight === i ? "bg-[var(--muted)]" : ""
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{item.title}</span>
                      <span className="block text-2xs text-muted-foreground truncate">{item.hint}</span>
                    </span>
                    {highlight === i && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
