"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight "live" layer: periodically refreshes the nearest server
 * components so new data appears without a manual reload. Pauses when the
 * tab is hidden or the user is offline. Deliberately gentle (default 30s).
 */
export function LiveRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        router.refresh();
      }
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);

  return null;
}
