"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()}>
      <Printer className="w-4 h-4" /> {label}
    </Button>
  );
}
