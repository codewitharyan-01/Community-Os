import { cn } from "@/lib/utils";

export function DemoBadge() {
  return (
    <span
      title="You're viewing seeded demo data. Reset it from Settings → Developer Tools."
      className={cn(
        "hidden md:inline-flex items-center gap-1.5 text-2xs font-medium text-muted-foreground",
        "border border-dashed border-[var(--border-strong)] rounded-full px-2.5 py-1"
      )}
    >
      Demo Mode
    </span>
  );
}
