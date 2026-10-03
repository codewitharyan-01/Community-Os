"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type CalendarEntry = {
  id: string;
  title: string;
  date: string; // ISO
  time?: string;
  kind: "event" | "booking" | "payment" | "meeting" | "operations" | "festival";
  href?: string;
};

const KIND_STYLE: Record<CalendarEntry["kind"], { dot: string; label: string }> = {
  event: { dot: "bg-[#0a0a0a]", label: "Event" },
  festival: { dot: "bg-purple-500", label: "Festival" },
  meeting: { dot: "bg-blue-500", label: "Meeting" },
  booking: { dot: "bg-emerald-500", label: "Your booking" },
  payment: { dot: "bg-amber-500", label: "Payment due" },
  operations: { dot: "bg-gray-400", label: "Operations" },
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthCalendar({ entries }: { entries: CalendarEntry[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(today.toDateString());

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const out: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      const key = new Date(e.date).toDateString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [entries]);

  const selectedEntries = byDay.get(selected) ?? [];

  function prev() { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); }
  function next() { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold tracking-tight">
          {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button onClick={prev} aria-label="Previous month" className="w-8 h-8 rounded-lg hover:bg-[var(--muted)] flex items-center justify-center text-muted-foreground">‹</button>
          <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today.toDateString()); }} className="text-xs px-2.5 h-8 rounded-lg hover:bg-[var(--muted)] text-muted-foreground">Today</button>
          <button onClick={next} aria-label="Next month" className="w-8 h-8 rounded-lg hover:bg-[var(--muted)] flex items-center justify-center text-muted-foreground">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-2xs text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const key = d.toDateString();
          const dayEntries = byDay.get(key) ?? [];
          const isToday = key === today.toDateString();
          const isSelected = key === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              aria-label={`${d.getDate()} — ${dayEntries.length} items`}
              className={cn(
                "relative mx-auto w-9 h-9 rounded-full text-[13px] flex items-center justify-center transition-colors",
                isSelected ? "bg-[#0a0a0a] text-white" : "hover:bg-[var(--muted)]",
                isToday && !isSelected && "font-semibold ring-1 ring-[var(--border-strong)]"
              )}
            >
              {d.getDate()}
              {dayEntries.length > 0 && (
                <span className={cn("absolute bottom-0.5 flex gap-0.5", isSelected && "translate-y-[-1px]")}>
                  {dayEntries.slice(0, 3).map((e, j) => (
                    <span key={j} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : KIND_STYLE[e.kind].dot)} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-xs font-medium text-muted-foreground mb-2.5">
          {new Date(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {selectedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nothing scheduled.</p>
        ) : (
          <div className="space-y-2">
            {selectedEntries.map((e) => (
              <a key={e.id} href={e.href ?? "#"} className="flex items-center gap-3 group">
                <span className={cn("w-2 h-2 rounded-full shrink-0", KIND_STYLE[e.kind].dot)} aria-hidden />
                <span className="text-sm flex-1 min-w-0 truncate group-hover:underline underline-offset-2">{e.title}</span>
                <span className="text-2xs text-muted-foreground shrink-0">{e.kind.toUpperCase()}{e.time ? ` · ${e.time}` : ""}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
