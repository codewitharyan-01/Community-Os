"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; body?: string };

const ToastCtx = createContext<{ toast: (kind: ToastKind, title: string, body?: string) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastCtx);
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const toast = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[90] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="pointer-events-auto bg-white border border-[var(--border)] shadow-pop rounded-xl px-4 py-3 flex items-start gap-3"
            >
              {t.kind === "success" && <CheckCircle2 className="w-5 h-5 text-[var(--status-green)] shrink-0 mt-0.5" />}
              {t.kind === "error" && <AlertCircle className="w-5 h-5 text-[var(--status-red)] shrink-0 mt-0.5" />}
              {t.kind === "info" && <Info className="w-5 h-5 text-[var(--status-blue)] shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.body && <p className="text-xs text-muted-foreground mt-0.5">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
