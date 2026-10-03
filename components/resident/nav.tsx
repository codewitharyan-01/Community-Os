"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Wallet, LayoutGrid, User, Plus, AlertTriangle, CarFront, Megaphone, DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/resident", label: "Home", icon: Home },
  { href: "/resident/community", label: "Community", icon: Users },
  { href: "/resident/payments", label: "Payments", icon: Wallet },
  { href: "/resident/services", label: "Services", icon: LayoutGrid },
  { href: "/resident/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-16">
        {NAV.map((item) => {
          const active = item.href === "/resident" ? pathname === "/resident" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-2xs transition-colors",
                active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Mobile FAB — quick actions (Report Issue / Invite Visitor / Create Post / Parking). */
export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname.startsWith("/resident/profile")) return null;

  const actions = [
    { href: "/resident/services/issues/new", label: "Report issue", icon: AlertTriangle },
    { href: "/resident/services/visitors?new=1", label: "Invite visitor", icon: DoorOpen },
    { href: "/resident/community?compose=1", label: "Create post", icon: Megaphone },
    { href: "/resident/services/parking", label: "My parking", icon: CarFront },
  ];

  return (
    <div className="sm:hidden fixed bottom-20 right-4 z-40">
      {open && <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} aria-hidden />}
      <div className="relative flex flex-col items-end gap-2">
        {open &&
          actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 bg-white border border-[var(--border)] shadow-pop rounded-full pl-4 pr-3 py-2.5 text-sm font-medium"
            >
              {a.label}
              <a.icon className="w-4 h-4" />
            </Link>
          ))}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          className={cn(
            "w-12 h-12 rounded-full bg-[#0a0a0a] text-white shadow-pop flex items-center justify-center transition-transform duration-200",
            open && "rotate-45"
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
