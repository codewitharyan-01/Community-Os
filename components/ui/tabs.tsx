"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string; count?: number };

/** URL-synced tabs (?tab=). Server-render friendly: updates URL, layout re-renders. */
export function Tabs({ tabs, param = "tab", className }: { tabs: TabDef[]; param?: string; className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const active = params.get(param) ?? tabs[0]?.id;

  function setTab(id: string) {
    const p = new URLSearchParams(params.toString());
    if (id === tabs[0]?.id) p.delete(param);
    else p.set(param, id);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-px scrollbar-none", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => setTab(t.id)}
          className={cn(
            "px-3.5 h-8 rounded-full text-sm whitespace-nowrap transition-colors font-medium",
            active === t.id
              ? "bg-[#0a0a0a] text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted)]"
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className={cn("ml-1.5 text-2xs", active === t.id ? "text-white/70" : "text-muted-foreground")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function LinkTab({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3.5 h-8 rounded-full text-sm whitespace-nowrap transition-colors font-medium flex items-center",
        active ? "bg-[#0a0a0a] text-white" : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted)]"
      )}
    >
      {children}
    </Link>
  );
}
