"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Wallet, AlertTriangle, Megaphone, ShieldCheck,
  Building2, Briefcase, Boxes, FileText, BarChart3, Sparkles, ScrollText, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { section: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { section: "Residents", href: "/admin/residents", icon: Users },
  { section: "Finance", href: "/admin/finance", icon: Wallet },
  { section: "Issues & Tasks", href: "/admin/issues", icon: AlertTriangle },
  { section: "Community", href: "/admin/community", icon: Megaphone },
  { section: "Security", href: "/admin/security", icon: ShieldCheck },
  { section: "Facilities", href: "/admin/facilities", icon: Building2 },
  { section: "Vendors", href: "/admin/vendors", icon: Briefcase },
  { section: "Assets", href: "/admin/assets", icon: Boxes },
  { section: "Documents", href: "/admin/documents", icon: FileText },
  { section: "Reports", href: "/admin/reports", icon: BarChart3 },
  { section: "AI", href: "/admin/ai", icon: Sparkles },
  { section: "Audit Logs", href: "/admin/audit", icon: ScrollText },
  { section: "Settings", href: "/admin/settings", icon: Settings },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function Sidebar({ communityName }: { communityName: string }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Admin">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive(pathname, item)
                ? "bg-[#0a0a0a] text-white font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted)]"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.section}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[var(--border)] text-2xs text-muted-foreground truncate">
        {communityName}
      </div>
    </>
  );
}

export function SidebarLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin mobile" className="space-y-0.5">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive(pathname, item)
              ? "bg-[#0a0a0a] text-white font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-[var(--muted)]"
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {item.section}
        </Link>
      ))}
    </nav>
  );
}
