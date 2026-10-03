"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarLinks } from "@/components/admin/sidebar";

/**
 * Mobile navigation drawer for the admin portal.
 * Rendered through a portal to <body> because the sticky header's
 * backdrop-blur creates a containing block that would trap fixed children.
 */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="w-9 h-9 rounded-lg hover:bg-[var(--muted)] flex items-center justify-center"
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[95]">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setOpen(false)}
                  aria-hidden
                />
                <motion.aside
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="absolute left-0 top-0 h-full w-72 bg-white border-r border-[var(--border)] shadow-pop flex flex-col"
                  role="dialog"
                  aria-label="Navigation"
                >
                  <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--border)]">
                    <p className="text-sm font-semibold tracking-tight">Community OS</p>
                    <button
                      onClick={() => setOpen(false)}
                      aria-label="Close navigation"
                      className="p-1.5 rounded-lg hover:bg-[var(--muted)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <nav className="flex-1 overflow-y-auto p-2" aria-label="Admin">
                    <SidebarLinks />
                  </nav>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
