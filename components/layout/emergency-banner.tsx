import { db } from "@/lib/db";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

/** Red emergency banner shown across all portals while an alert is active. */
export async function EmergencyBanner({ communityId }: { communityId: string }) {
  const alert = await db.emergencyAlert.findFirst({
    where: { communityId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!alert) return null;
  return (
    <div className="bg-[var(--status-red)] text-white" role="alert">
      <div className="container-app py-2.5 flex items-center gap-3 text-sm">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <AlertTriangle className="w-4 h-4 shrink-0 hidden sm:block" />
        <p className="font-medium min-w-0 truncate">
          <span className="font-semibold uppercase mr-2">{alert.type} emergency</span>
          <span className="text-white/85">{alert.message}</span>
        </p>
        <Link href="/resident/community?tab=alerts" className="ml-auto text-xs underline underline-offset-2 shrink-0 hover:text-white/80">
          Details
        </Link>
      </div>
    </div>
  );
}
