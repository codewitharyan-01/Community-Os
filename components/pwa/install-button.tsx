"use client";

import { useEffect, useState } from "react";
import { Download, MonitorSmartphone } from "lucide-react";
import { DropdownItem } from "@/components/ui/dropdown";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install app" menu item — appears when the browser exposes the PWA prompt. */
export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || installed) return null;
  return (
    <DropdownItem
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setDeferred(null);
      }}
    >
      <Download className="w-4 h-4" /> Install app
    </DropdownItem>
  );
}

/** Inline install card for the profile page. */
export function InstallCard() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <MonitorSmartphone className="w-4 h-4" /> App installed — you&rsquo;re running the standalone experience.
      </div>
    );
  }
  if (!deferred) {
    return (
      <p className="text-sm text-muted-foreground">
        Open your browser menu → <span className="font-medium text-foreground">&ldquo;Add to Home screen&rdquo;</span> to install Community OS as an app.
      </p>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-muted-foreground">Install Community OS for a full-screen, app-like experience.</p>
      <button
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#262626] transition-colors"
      >
        <Download className="w-4 h-4" /> Install app
      </button>
    </div>
  );
}
