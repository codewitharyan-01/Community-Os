"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-[var(--status-red-bg)] text-[var(--status-red)] flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Something went wrong.</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your data is safe. The page hit an unexpected error — please try again.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#262626] transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Go home</Link>
        </div>
      </div>
    </div>
  );
}
