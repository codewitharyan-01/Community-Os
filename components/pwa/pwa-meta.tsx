"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (offline shell + asset caching).
 * Production only: dev bundles are un-hashed, and a cache-first SW would
 * serve stale code during development.
 */
export function PWAMeta() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
