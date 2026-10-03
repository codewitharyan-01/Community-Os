"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, CheckCheck, Wallet, AlertTriangle, Vote, CalendarDays, DoorOpen, CarFront,
  ShieldAlert, Megaphone, Siren, Info,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  priority: string;
  createdAt: string;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  PAYMENT: Wallet, ISSUE: AlertTriangle, POLL: Vote, EVENT: CalendarDays,
  VISITOR: DoorOpen, PARKING: CarFront, SECURITY: ShieldAlert, ANNOUNCEMENT: Megaphone,
  EMERGENCY: Siren, SYSTEM: Info,
};

/**
 * Live notification bell: polls /api/notifications every 20s (only while the tab
 * is visible) so new events appear without a manual refresh.
 */
export function NotificationsBell({ initial }: { initial: NotificationDTO[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>(initial);
  const [unread, setUnread] = useState(initial.filter((n) => !n.read).length);

  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationDTO[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline — keep last known state */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, 20_000);
    return () => clearInterval(t);
  }, [sync]);

  useEffect(() => {
    setItems(initial);
    setUnread(initial.filter((n) => !n.read).length);
  }, [initial]);

  async function markAll() {
    setItems((xs) => xs.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAll" }),
    }).catch(() => {});
  }

  async function openItem(n: NotificationDTO) {
    setOpen(false);
    if (!n.read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markOne", id: n.id }),
      }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        onClick={async () => {
          setOpen((o) => !o);
          if (!open) void sync();
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] rounded-full bg-[var(--status-red)] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[var(--border)] shadow-pop overflow-hidden"
              role="menu"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAll} className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {items.length === 0 && (
                  <div className="py-10 text-center">
                    <Bell className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
                  </div>
                )}
                {items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] ?? Info;
                  const inner = (
                    <div className={`px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors ${n.read ? "opacity-60" : "bg-[var(--subtle)]"} ${n.priority === "HIGH" && !n.read ? "border-l-2 border-l-[var(--status-red)]" : ""}`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.type === "EMERGENCY" ? "bg-[var(--status-red-bg)] text-[var(--status-red)]" : "bg-[var(--muted)]"}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] leading-snug ${n.priority === "HIGH" && !n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
                          <p className="text-2xs text-muted-foreground mt-1">{relativeTime(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0a0a0a] shrink-0" />}
                      </div>
                    </div>
                  );
                  return (
                    <button key={n.id} onClick={() => openItem(n)} className="block w-full text-left hover:bg-[var(--muted)]/50">
                      {inner}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


